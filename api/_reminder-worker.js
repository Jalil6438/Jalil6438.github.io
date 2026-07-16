import { randomBytes } from "node:crypto";
import webpush from "web-push";
import {
  PROC_TTL_SECONDS,
  SENT_TTL_SECONDS,
  PUSH_DELIVERY_RESULT,
  buildReminderPayload,
  classifyPushDeliveryFailure,
  computeDueSessions,
  isAllowedPushEndpoint,
  procKey,
  redis,
  sentKey,
  subsKey,
} from "./_push-lib.js";
import {
  REMINDER_BATCH_SIZE,
  REMINDER_JOB_STATES,
  REMINDER_MAX_ATTEMPTS,
  REMINDER_RUN_BUDGET_MS,
  REMINDER_RUN_MAX_PASSES,
  emptyReminderSummary,
  makeDeliveryReceipt,
  makeReminderJob,
  mergeReminderSummary,
  retryAfterMsFromError,
  retryDelayMs,
  safeJobSummary,
} from "./_reminder-control.js";
import { createReminderStore } from "./_reminder-store.js";

const resultOf = (reply, index = 0) => reply?.[index]?.result;
const safeTargetRef = (id) => (
  typeof id === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(id) ? id : "invalid"
);

function parseScan(result) {
  if (!Array.isArray(result) || result.length < 2 || !Array.isArray(result[1])) return { cursor: "0", records: [] };
  const records = [];
  for (let index = 0; index + 1 < result[1].length; index += 2) {
    try { records.push({ id: result[1][index], record: JSON.parse(result[1][index + 1]) }); }
    catch { records.push({ id: result[1][index], record: null }); }
  }
  return { cursor: String(result[0]), records };
}

export function createReminderWorker({
  store = createReminderStore(),
  execute = redis,
  sendNotification = (...args) => webpush.sendNotification(...args),
  now = () => Date.now(),
  random = Math.random,
  workerId = `rw_${randomBytes(12).toString("hex")}`,
  hooks = {},
  maxRunPasses = REMINDER_RUN_MAX_PASSES,
  runBudgetMs = REMINDER_RUN_BUDGET_MS,
} = {}) {
  const boundedRunPasses = Math.max(1, Math.min(
    REMINDER_RUN_MAX_PASSES,
    Number(maxRunPasses) || REMINDER_RUN_MAX_PASSES,
  ));
  const boundedRunBudgetMs = Math.max(1, Math.min(
    REMINDER_RUN_BUDGET_MS,
    Number(runBudgetMs) || REMINDER_RUN_BUDGET_MS,
  ));
  async function createJob({ scheduledTime = now(), sourceTrigger = "cron" } = {}) {
    return store.createJob(makeReminderJob({ scheduledTime, sourceTrigger, createdAt: now() }));
  }

  async function appendReceipt(job, details) {
    await store.appendReceipt(job.jobId, makeDeliveryReceipt({
      ...details,
      attemptNumber: job.attemptCount,
      timestamp: now(),
    }));
  }

  async function processNext() {
    const claimedAt = now();
    const job = await store.claimNext({ workerId, nowMs: claimedAt });
    if (!job) return null;
    await hooks.afterClaim?.(job);

    if (job.attemptCount > REMINDER_MAX_ATTEMPTS) {
      const finalized = await store.finalize(job, workerId, {
        state: REMINDER_JOB_STATES.DEAD_LETTER,
        summary: job.resultSummary,
        nowMs: now(),
        reason: "retry-exhausted",
      });
      return safeJobSummary(finalized);
    }

    const scanReply = await execute([[
      "HSCAN", subsKey(), job.cursor || "0", "COUNT", String(REMINDER_BATCH_SIZE),
    ]]);
    const batch = parseScan(resultOf(scanReply));
    const delta = emptyReminderSummary();
    let passTemporaryFailures = Number(job.passTemporaryFailures || 0);
    let passRetryAfterMs = Number(job.passRetryAfterMs || 0);

    for (const { id, record } of batch.records) {
      delta.checked += 1;
      const targetRef = safeTargetRef(id);
      if (!record || !isAllowedPushEndpoint(record.endpoint)) {
        await execute([["HDEL", subsKey(), id]]);
        delta.invalidRecords += 1;
        delta.deadRemoved += 1;
        await appendReceipt(job, {
          targetRef,
          deliveryState: PUSH_DELIVERY_RESULT.DEAD_REMOVED,
          subscriptionRemoved: true,
          retryAllowed: false,
        });
        continue;
      }
      if (record.enabled === false) { delta.disabled += 1; continue; }
      const lock = Number(record.lockedUntil);
      if (Number.isFinite(lock) && lock > job.scheduledTime) { delta.locked += 1; continue; }

      const due = computeDueSessions({
        prefs: record.prefs,
        tzOffsetMinutes: record.tz,
        nowMs: job.scheduledTime,
        lockedUntilMs: record.lockedUntil,
      });
      for (const { id: sessionId, dayKey } of due) {
        delta.targeted += 1;
        const deliveredKey = sentKey(id, sessionId, dayKey);
        const processingKey = procKey(id, sessionId, dayKey);
        const claim = await execute([[
          "SET", processingKey, "1", "EX", String(PROC_TTL_SECONDS), "NX",
        ]]);
        if (resultOf(claim) !== "OK") { delta.duplicates += 1; continue; }
        const delivered = await execute([["GET", deliveredKey]]);
        if (resultOf(delivered)) { delta.duplicates += 1; continue; }

        const payload = JSON.stringify(buildReminderPayload(sessionId, dayKey));
        let providerError = null;
        try {
          await sendNotification(
            { endpoint: record.endpoint, keys: record.keys },
            payload,
            { TTL: 60 * 60 },
          );
        } catch (error) {
          providerError = error;
        }

        if (!providerError) {
          await execute([["SET", deliveredKey, "1", "EX", String(SENT_TTL_SECONDS)]]);
          await hooks.afterDeliveryMarker?.({ job, targetRef, sessionId });
          delta.delivered += 1;
          await appendReceipt(job, {
            targetRef,
            deliveryState: PUSH_DELIVERY_RESULT.DELIVERED,
            providerStatus: 201,
            retryAllowed: false,
          });
        } else {
          const failure = classifyPushDeliveryFailure(providerError);
          if (failure.result === PUSH_DELIVERY_RESULT.DEAD_REMOVED) {
            await execute([["HDEL", subsKey(), id]]);
            delta.deadRemoved += 1;
            await appendReceipt(job, {
              targetRef,
              deliveryState: failure.result,
              providerStatus: failure.status,
              subscriptionRemoved: true,
              retryAllowed: false,
            });
            break;
          }

          try { await execute([["DEL", processingKey]]); } catch { /* processing TTL recovers */ }
          if (failure.result === PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE) delta.temporaryFailures += 1;
          else delta.unexpectedFailures += 1;
          passTemporaryFailures += 1;
          passRetryAfterMs = Math.max(passRetryAfterMs, retryAfterMsFromError(providerError, now()));
          await appendReceipt(job, {
            targetRef,
            deliveryState: failure.result,
            providerStatus: failure.status,
            retryAllowed: job.attemptCount < REMINDER_MAX_ATTEMPTS,
          });
        }
      }
    }

    const summary = mergeReminderSummary(job.resultSummary, delta);
    await hooks.afterBatch?.({ job, batch, summary });
    if (batch.cursor !== "0") {
      const requeued = await store.requeueBatch(job, workerId, {
        cursor: batch.cursor,
        summary,
        passTemporaryFailures,
        passRetryAfterMs,
        nowMs: now(),
      });
      return safeJobSummary(requeued);
    }

    await hooks.beforeFinalize?.({ job, summary, passTemporaryFailures });
    if (passTemporaryFailures > 0) {
      if (job.attemptCount >= REMINDER_MAX_ATTEMPTS) {
        const dead = await store.finalize(job, workerId, {
          state: REMINDER_JOB_STATES.DEAD_LETTER,
          summary,
          nowMs: now(),
          reason: "retry-exhausted",
        });
        return safeJobSummary(dead);
      }
      const nextRetryAt = now() + retryDelayMs({
        attemptCount: job.attemptCount,
        retryAfterMs: passRetryAfterMs,
        random,
      });
      const retry = await store.scheduleRetry(job, workerId, {
        nextRetryAt,
        summary,
        nowMs: now(),
        reason: "temporary-delivery-failure",
      });
      return safeJobSummary(retry);
    }

    const partial = summary.deadRemoved > 0 || summary.unexpectedFailures > 0 || summary.invalidRecords > 0;
    const completed = await store.finalize(job, workerId, {
      state: partial ? REMINDER_JOB_STATES.PARTIAL_FAILURE : REMINDER_JOB_STATES.COMPLETED,
      summary,
      nowMs: now(),
      reason: partial ? "bounded-partial-failure" : null,
    });
    return safeJobSummary(completed);
  }

  async function triggerAndProcess(options) {
    const created = await createJob(options);
    const runStartedAt = now();
    let processed = null;
    let triggerJob = null;
    let workerPasses = 0;
    while (
      workerPasses < boundedRunPasses &&
      now() - runStartedAt < boundedRunBudgetMs
    ) {
      const next = await processNext();
      if (!next) break;
      processed = next;
      workerPasses += 1;
      if (next.jobId === created.job.jobId) triggerJob = next;
    }
    return {
      created: created.created,
      job: triggerJob || safeJobSummary(created.job),
      processedJob: processed,
      workerPasses,
      drainLimited:
        workerPasses >= boundedRunPasses ||
        now() - runStartedAt >= boundedRunBudgetMs,
    };
  }

  return { createJob, processNext, triggerAndProcess, workerId };
}
