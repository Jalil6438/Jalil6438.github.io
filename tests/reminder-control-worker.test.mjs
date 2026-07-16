import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  REMINDER_JOB_STATES,
  REMINDER_LEASE_MS,
  REMINDER_MAX_ATTEMPTS,
  REMINDER_RECEIPT_CAP,
  makeReminderJob,
  reminderWindowStart,
} from "../api/_reminder-control.js";
import { createReminderWorker } from "../api/_reminder-worker.js";
import { subsKey } from "../api/_push-lib.js";

beforeEach(() => { process.env.VERCEL_ENV = "test"; });

function makeHarness({ hookFactory } = {}) {
  const clock = { now: Date.UTC(2026, 6, 16, 12, 7) };
  const jobs = new Map();
  const idempotency = new Map();
  const queue = new Map();
  const leases = new Map();
  const receipts = new Map();
  const subscriptions = new Map();
  const strings = new Map();
  const sends = [];

  const live = (key) => {
    const value = strings.get(key);
    if (value && value.expiresAt <= clock.now) { strings.delete(key); return null; }
    return value || null;
  };
  const store = {
    async createJob(job) {
      const existingId = idempotency.get(job.idempotencyKey);
      if (existingId) return { job: structuredClone(jobs.get(existingId)), created: false };
      jobs.set(job.jobId, structuredClone(job)); idempotency.set(job.idempotencyKey, job.jobId);
      queue.set(job.jobId, job.scheduledTime);
      return { job: structuredClone(job), created: true };
    },
    async getJob(id) { return structuredClone(jobs.get(id) || null); },
    async claimNext({ workerId, nowMs }) {
      const candidate = [...queue].filter(([, score]) => score <= nowMs).sort((a, b) => a[1] - b[1])[0];
      if (!candidate) return null;
      const [id] = candidate;
      const lease = leases.get(id);
      if (lease && lease.expiresAt > nowMs) return null;
      const job = jobs.get(id);
      if (!job || !["QUEUED", "RETRY_PENDING", "PROCESSING"].includes(job.state)) return null;
      const priorState = job.state;
      if (job.cursor === "0" || priorState === REMINDER_JOB_STATES.PROCESSING) {
        job.attemptCount += 1;
      }
      if (priorState === REMINDER_JOB_STATES.PROCESSING) {
        if (!job.firstFailureAt) job.firstFailureAt = nowMs;
        job.lastFailureAt = nowMs;
        job.sanitizedReason = "lease-expired";
      }
      if (job.cursor === "0") {
        job.passTemporaryFailures = 0;
        job.passRetryAfterMs = 0;
      }
      job.state = REMINDER_JOB_STATES.PROCESSING;
      leases.set(id, { workerId, expiresAt: nowMs + REMINDER_LEASE_MS });
      queue.set(id, nowMs + REMINDER_LEASE_MS);
      return structuredClone(job);
    },
    async appendReceipt(id, receipt) {
      const list = receipts.get(id) || [];
      list.unshift(structuredClone(receipt));
      receipts.set(id, list.slice(0, REMINDER_RECEIPT_CAP));
    },
    async requeueBatch(job, workerId, update) {
      assert.equal(leases.get(job.jobId)?.workerId, workerId);
      const saved = jobs.get(job.jobId);
      Object.assign(saved, update, {
        state: REMINDER_JOB_STATES.QUEUED,
        nextRetryAt: update.nowMs,
        resultSummary: update.summary,
      });
      queue.set(job.jobId, update.nowMs); leases.delete(job.jobId);
      return structuredClone(saved);
    },
    async scheduleRetry(job, workerId, update) {
      assert.equal(leases.get(job.jobId)?.workerId, workerId);
      const saved = jobs.get(job.jobId);
      Object.assign(saved, update, {
        state: REMINDER_JOB_STATES.RETRY_PENDING,
        cursor: "0",
        resultSummary: update.summary,
        firstFailureAt: saved.firstFailureAt || update.nowMs,
        lastFailureAt: update.nowMs,
        sanitizedReason: update.reason,
      });
      queue.set(job.jobId, update.nextRetryAt); leases.delete(job.jobId);
      return structuredClone(saved);
    },
    async finalize(job, workerId, update) {
      assert.equal(leases.get(job.jobId)?.workerId, workerId);
      const saved = jobs.get(job.jobId);
      Object.assign(saved, update, {
        state: update.state,
        cursor: "0",
        resultSummary: update.summary,
        completionTime: update.nowMs,
        nextRetryAt: null,
        sanitizedReason: update.reason,
      });
      queue.delete(job.jobId); leases.delete(job.jobId);
      return structuredClone(saved);
    },
  };

  const execute = async (commands) => commands.map((command) => {
    const [operation, ...args] = command;
    if (operation === "HSCAN") {
      const entries = [...subscriptions];
      const offset = Number(args[1] || 0);
      const countIndex = args.indexOf("COUNT");
      const count = countIndex >= 0 ? Number(args[countIndex + 1]) : 10;
      const page = entries.slice(offset, offset + count);
      const next = offset + count < entries.length ? String(offset + count) : "0";
      const flat = page.flatMap(([id, record]) => [id, JSON.stringify(record)]);
      return { result: [next, flat] };
    }
    if (operation === "HDEL") return { result: subscriptions.delete(args[1]) ? 1 : 0 };
    if (operation === "SET") {
      const key = args[0];
      if (args.includes("NX") && live(key)) return { result: null };
      const exIndex = args.indexOf("EX");
      const seconds = exIndex >= 0 ? Number(args[exIndex + 1]) : 3600;
      strings.set(key, { value: args[1], expiresAt: clock.now + seconds * 1000 });
      return { result: "OK" };
    }
    if (operation === "GET") return { result: live(args[0])?.value ?? null };
    if (operation === "DEL") return { result: strings.delete(args[0]) ? 1 : 0 };
    throw new Error(`unsupported worker Redis command ${operation}`);
  });

  function addSubscription(id, endpoint, sessions) {
    subscriptions.set(id, {
      endpoint,
      keys: { p256dh: "UNIT_P256DH", auth: "UNIT_AUTH" },
      enabled: true,
      tz: 0,
      prefs: { sessions },
    });
  }
  const scheduledTime = reminderWindowStart(clock.now);
  const target = new Date(scheduledTime - 2 * 60 * 1000);
  const dueTime = `${String(target.getUTCHours()).padStart(2, "0")}:${String(target.getUTCMinutes()).padStart(2, "0")}`;
  const dueSessions = () => ({ fajr: { enabled: true, time: dueTime } });
  const sendNotification = async (subscription) => {
    sends.push(subscription.endpoint);
    return { statusCode: 201 };
  };
  const worker = (options = {}) => createReminderWorker({
    store, execute,
    sendNotification: options.sendNotification || sendNotification,
    now: () => clock.now,
    random: options.random || (() => 0.5),
    workerId: options.workerId || "worker_primary",
    hooks: options.hooks || hookFactory?.() || {},
  });
  return {
    clock, jobs, queue, leases, receipts, subscriptions, strings, sends,
    store, execute, worker, addSubscription, dueSessions, scheduledTime,
  };
}

test("successful job completes and duplicate trigger never resends", async () => {
  const h = makeHarness();
  h.addSubscription("target_one", "https://fcm.googleapis.com/fcm/send/UNIT_ONE", h.dueSessions());
  const first = await h.worker().triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  const duplicate = await h.worker({ workerId: "worker_second" }).triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "vercel-cron" });
  assert.equal(first.created, true);
  assert.equal(first.job.state, REMINDER_JOB_STATES.COMPLETED);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.job.jobId, first.job.jobId);
  assert.equal(h.sends.length, 1);
  assert.equal(h.receipts.get(first.job.jobId).length, 1);
});

test("large subscription sets process in bounded batches without consuming retry attempts", async () => {
  const h = makeHarness();
  for (let index = 0; index < 105; index += 1) {
    h.addSubscription(
      `target_${String(index).padStart(3, "0")}`,
      `https://fcm.googleapis.com/fcm/send/UNIT_BATCH_${index}`,
      h.dueSessions(),
    );
  }
  const worker = h.worker();
  const first = await worker.triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  assert.equal(first.job.state, REMINDER_JOB_STATES.QUEUED);
  assert.equal(first.job.attemptCount, 1);
  assert.equal(h.sends.length, 100);
  const second = await worker.processNext();
  assert.equal(second.state, REMINDER_JOB_STATES.COMPLETED);
  assert.equal(second.attemptCount, 1);
  assert.equal(h.sends.length, 105);
});

test("404 and 410 remove only dead targets and produce a partial job", async () => {
  const h = makeHarness();
  h.addSubscription("dead_404", "https://fcm.googleapis.com/fcm/send/UNIT_404", h.dueSessions());
  h.addSubscription("dead_410", "https://fcm.googleapis.com/fcm/send/UNIT_410", h.dueSessions());
  h.addSubscription("healthy", "https://fcm.googleapis.com/fcm/send/UNIT_OK", h.dueSessions());
  const send = async (subscription) => {
    h.sends.push(subscription.endpoint);
    if (subscription.endpoint.endsWith("404")) throw Object.assign(new Error("gone"), { statusCode: 404 });
    if (subscription.endpoint.endsWith("410")) throw Object.assign(new Error("gone"), { statusCode: 410 });
    return { statusCode: 201 };
  };
  const result = await h.worker({ sendNotification: send }).triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  assert.equal(result.job.state, REMINDER_JOB_STATES.PARTIAL_FAILURE);
  assert.equal(result.job.resultSummary.deadRemoved, 2);
  assert.equal(result.job.resultSummary.delivered, 1);
  assert.deepEqual([...h.subscriptions.keys()], ["healthy"]);
});

for (const failure of [
  { label: "429", statusCode: 429 },
  { label: "500", statusCode: 500 },
  { label: "timeout", code: "ETIMEDOUT" },
]) {
  test(`${failure.label} schedules retry without deleting the subscription`, async () => {
    const h = makeHarness();
    h.addSubscription("retry_target", "https://fcm.googleapis.com/fcm/send/UNIT_RETRY", h.dueSessions());
    const send = async () => { throw Object.assign(new Error("private provider body"), failure); };
    const result = await h.worker({ sendNotification: send }).triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
    assert.equal(result.job.state, REMINDER_JOB_STATES.RETRY_PENDING);
    assert.ok(result.job.nextRetryAt > h.clock.now);
    assert.equal(h.subscriptions.has("retry_target"), true);
    assert.equal(h.receipts.get(result.job.jobId)[0].retryAllowed, true);
    assert.equal(JSON.stringify(h.receipts).includes("private provider body"), false);
  });
}

test("Retry-After delays the next claim beyond the normal first backoff", async () => {
  const h = makeHarness();
  h.addSubscription("retry_target", "https://fcm.googleapis.com/fcm/send/UNIT_RETRY_AFTER", h.dueSessions());
  const send = async () => {
    throw Object.assign(new Error("rate limited"), { statusCode: 429, headers: { "retry-after": "600" } });
  };
  const result = await h.worker({ sendNotification: send, random: () => 0 }).triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  assert.ok(result.job.nextRetryAt >= h.clock.now + 600_000);
});

test("retry exhaustion enters dead letter with no infinite loop", async () => {
  const h = makeHarness();
  h.addSubscription("retry_target", "https://fcm.googleapis.com/fcm/send/UNIT_EXHAUST", h.dueSessions());
  const send = async () => { throw Object.assign(new Error("temporary"), { statusCode: 503 }); };
  const worker = h.worker({ sendNotification: send });
  let result = await worker.triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  while (result.job.state === REMINDER_JOB_STATES.RETRY_PENDING) {
    h.clock.now = result.job.nextRetryAt;
    result = { job: await worker.processNext() };
  }
  assert.equal(result.job.state, REMINDER_JOB_STATES.DEAD_LETTER);
  assert.equal(result.job.attemptCount, REMINDER_MAX_ATTEMPTS);
  assert.equal(h.subscriptions.has("retry_target"), true);
  assert.equal(h.sends.length, 0);
});

test("crash after a persisted delivery marker recovers without duplicate notification", async () => {
  let crash = true;
  const h = makeHarness();
  h.addSubscription("first", "https://fcm.googleapis.com/fcm/send/UNIT_FIRST", h.dueSessions());
  h.addSubscription("second", "https://fcm.googleapis.com/fcm/send/UNIT_SECOND", h.dueSessions());
  const crashing = h.worker({
    hooks: { afterDeliveryMarker: () => { if (crash) { crash = false; throw new Error("simulated crash"); } } },
  });
  await crashing.createJob({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  await assert.rejects(() => crashing.processNext(), /simulated crash/);
  assert.equal(h.sends.length, 1);

  h.clock.now += REMINDER_LEASE_MS + 1;
  const recovered = await h.worker({ workerId: "worker_recovery" }).processNext();
  assert.equal(recovered.state, REMINDER_JOB_STATES.COMPLETED);
  assert.equal(h.sends.length, 2, "first target was not sent twice");
});

test("crash before finalization recovers and completed markers suppress all resends", async () => {
  let crash = true;
  const h = makeHarness();
  h.addSubscription("only", "https://fcm.googleapis.com/fcm/send/UNIT_FINALIZE", h.dueSessions());
  const crashing = h.worker({ hooks: { beforeFinalize: () => { if (crash) { crash = false; throw new Error("finalize crash"); } } } });
  await crashing.createJob({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  await assert.rejects(() => crashing.processNext(), /finalize crash/);
  h.clock.now += REMINDER_LEASE_MS + 1;
  const recovered = await h.worker({ workerId: "worker_recovery" }).processNext();
  assert.equal(recovered.state, REMINDER_JOB_STATES.COMPLETED);
  assert.equal(h.sends.length, 1);
});

test("invalid environment fails before job creation or delivery", async () => {
  const h = makeHarness();
  h.addSubscription("only", "https://fcm.googleapis.com/fcm/send/UNIT_NONE", h.dueSessions());
  delete process.env.VERCEL_ENV;
  await assert.rejects(
    () => h.worker().triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" }),
    /VERCEL_ENV/,
  );
  assert.equal(h.jobs.size, 0);
  assert.equal(h.sends.length, 0);
});

test("worker touches only the environment-scoped subscription hash", async () => {
  const h = makeHarness();
  h.addSubscription("only", "https://fcm.googleapis.com/fcm/send/UNIT_SCOPE", h.dueSessions());
  const touched = [];
  const execute = async (commands) => {
    touched.push(...commands.map((command) => command[1]));
    return h.execute(commands);
  };
  const worker = createReminderWorker({
    store: h.store,
    execute,
    sendNotification: async () => ({ statusCode: 201 }),
    now: () => h.clock.now,
    workerId: "worker_scope",
  });
  await worker.triggerAndProcess({ scheduledTime: h.scheduledTime, sourceTrigger: "qstash" });
  assert.ok(touched.includes(subsKey()));
  assert.ok(touched.every((key) => String(key).startsWith("test:")));
});
