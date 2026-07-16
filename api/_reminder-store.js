import { redis } from "./_push-lib.js";
import {
  REMINDER_CLEANUP_LIMIT,
  REMINDER_DEAD_LIST_CAP,
  REMINDER_HEALTH_SAMPLE_CAP,
  REMINDER_IDEMPOTENCY_TTL_SECONDS,
  REMINDER_JOB_STATES,
  REMINDER_JOB_TTL_SECONDS,
  REMINDER_LEASE_MS,
  REMINDER_RECEIPT_CAP,
  REMINDER_RECEIPT_TTL_SECONDS,
  REMINDER_TERMINAL_STATES,
  jobToRedisFields,
  redisHashToJob,
  reminderIdempotencyKey,
  reminderJobKey,
  reminderLeaseKey,
  reminderMetaKey,
  reminderQueueKey,
  reminderReceiptKey,
  reminderStateKey,
  safeJobId,
  safeJobSummary,
} from "./_reminder-control.js";

export const REMINDER_CREATE_LUA = `-- reminder-create-v1
local existing = redis.call('GET', KEYS[1])
if existing then return {existing, '0'} end
if redis.call('EXISTS', KEYS[2]) == 1 then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
  return {ARGV[1], '0'}
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
for i = 5, #ARGV, 2 do redis.call('HSET', KEYS[2], ARGV[i], ARGV[i + 1]) end
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[4], ARGV[1])
redis.call('SADD', KEYS[4], ARGV[1])
redis.call('HSET', KEYS[5], 'lastCreatedAt', ARGV[4])
redis.call('EXPIRE', KEYS[5], ARGV[3])
return {ARGV[1], '1'}`;

export const REMINDER_CLAIM_LUA = `-- reminder-claim-v1
local score = redis.call('ZSCORE', KEYS[1], ARGV[1])
if not score or tonumber(score) > tonumber(ARGV[3]) then return {} end
if not redis.call('SET', KEYS[3], ARGV[2], 'NX', 'PX', ARGV[4]) then return {} end
local state = redis.call('HGET', KEYS[2], 'state')
if state ~= 'QUEUED' and state ~= 'RETRY_PENDING' and state ~= 'PROCESSING' then
  redis.call('DEL', KEYS[3]); return {}
end
local cursor = redis.call('HGET', KEYS[2], 'cursor') or '0'
local attempt = tonumber(redis.call('HGET', KEYS[2], 'attemptCount') or '0')
if cursor == '0' or state == 'PROCESSING' then
  attempt = attempt + 1
end
if state == 'PROCESSING' then
  local firstFailure = redis.call('HGET', KEYS[2], 'firstFailureAt')
  if not firstFailure or firstFailure == '' then
    redis.call('HSET', KEYS[2], 'firstFailureAt', ARGV[3])
  end
  redis.call('HSET', KEYS[2], 'lastFailureAt', ARGV[3], 'sanitizedReason', 'lease-expired')
end
if cursor == '0' then
  redis.call('HSET', KEYS[2], 'passTemporaryFailures', '0', 'passRetryAfterMs', '0')
end
local leaseUntil = tonumber(ARGV[3]) + tonumber(ARGV[4])
redis.call('HSET', KEYS[2], 'state', 'PROCESSING', 'attemptCount', tostring(attempt), 'leaseUntil', tostring(leaseUntil))
redis.call('EXPIRE', KEYS[2], ARGV[5])
redis.call('ZADD', KEYS[1], tostring(leaseUntil), ARGV[1])
redis.call('SREM', KEYS[4], ARGV[1])
redis.call('SREM', KEYS[5], ARGV[1])
redis.call('SADD', KEYS[6], ARGV[1])
return redis.call('HGETALL', KEYS[2])`;

export const REMINDER_TRANSITION_LUA = `-- reminder-transition-v1
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
for i = 6, #KEYS do redis.call('SREM', KEYS[i], ARGV[6]) end
redis.call('SADD', KEYS[5], ARGV[6])
for i = 8, #ARGV, 2 do redis.call('HSET', KEYS[1], ARGV[i], ARGV[i + 1]) end
redis.call('HSET', KEYS[1], 'state', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[4])
if ARGV[3] == '' then redis.call('ZREM', KEYS[3], ARGV[6])
else redis.call('ZADD', KEYS[3], ARGV[3], ARGV[6]) end
if ARGV[5] ~= '' then redis.call('HSET', KEYS[4], ARGV[5], ARGV[7]) end
redis.call('EXPIRE', KEYS[4], ARGV[4])
redis.call('DEL', KEYS[2])
return 1`;

export const REMINDER_ADMIN_LUA = `-- reminder-admin-v1
local state = redis.call('HGET', KEYS[1], 'state')
if not state then return {} end
local action = ARGV[1]
local newState = ''
if action == 'retry' then
  if state ~= 'DEAD_LETTER' then return {} end
  local retries = tonumber(redis.call('HGET', KEYS[1], 'manualRetryCount') or '0')
  if retries >= 1 then return {} end
  newState = 'RETRY_PENDING'
  redis.call('HSET', KEYS[1], 'manualRetryCount', tostring(retries + 1), 'manualRetryAllowed', 'false',
    'attemptCount', '0', 'cursor', '0', 'nextRetryAt', ARGV[2], 'completionTime', '', 'sanitizedReason', 'manual-retry')
  redis.call('ZADD', KEYS[3], ARGV[2], ARGV[4])
elseif action == 'cancel' or action == 'resolve' then
  if state == 'COMPLETED' or state == 'PARTIAL_FAILURE' or state == 'CANCELLED' then return {} end
  newState = 'CANCELLED'
  redis.call('HSET', KEYS[1], 'completionTime', ARGV[2], 'nextRetryAt', '', 'resolution', action,
    'manualRetryAllowed', 'false', 'sanitizedReason', action)
  redis.call('ZREM', KEYS[3], ARGV[4])
else return {} end
for i = 5, #KEYS do redis.call('SREM', KEYS[i], ARGV[4]) end
redis.call('SADD', KEYS[4], ARGV[4])
redis.call('HSET', KEYS[1], 'state', newState)
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('DEL', KEYS[2])
return redis.call('HGETALL', KEYS[1])`;

const allStates = Object.values(REMINDER_JOB_STATES);
const stateKeys = () => allStates.map(reminderStateKey);
const resultOf = (reply, index = 0) => reply?.[index]?.result;

export function createReminderStore({ execute = redis } = {}) {
  async function getJob(jobId) {
    const reply = await execute([["HGETALL", reminderJobKey(jobId)]]);
    return redisHashToJob(resultOf(reply) || []);
  }

  async function createJob(job) {
    const fields = jobToRedisFields(job);
    const reply = await execute([[
      "EVAL", REMINDER_CREATE_LUA, "5",
      reminderIdempotencyKey(job.idempotencyKey), reminderJobKey(job.jobId),
      reminderQueueKey(), reminderStateKey(REMINDER_JOB_STATES.QUEUED), reminderMetaKey(),
      job.jobId, String(REMINDER_IDEMPOTENCY_TTL_SECONDS), String(REMINDER_JOB_TTL_SECONDS),
      String(job.scheduledTime), ...fields,
    ]]);
    const result = resultOf(reply);
    if (!Array.isArray(result) || !result[0]) throw new Error("reminder job creation failed");
    const stored = await getJob(result[0]);
    if (!stored) throw new Error("reminder job unavailable");
    return { job: stored, created: result[1] === "1" || result[1] === 1 };
  }

  async function claimNext({ workerId, nowMs }) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(workerId)) throw new Error("invalid worker id");
    const candidatesReply = await execute([[
      "ZRANGEBYSCORE", reminderQueueKey(), "-inf", String(nowMs), "LIMIT", "0", "10",
    ]]);
    for (const jobId of resultOf(candidatesReply) || []) {
      safeJobId(jobId);
      const reply = await execute([[
        "EVAL", REMINDER_CLAIM_LUA, "6",
        reminderQueueKey(), reminderJobKey(jobId), reminderLeaseKey(jobId),
        reminderStateKey(REMINDER_JOB_STATES.QUEUED),
        reminderStateKey(REMINDER_JOB_STATES.RETRY_PENDING),
        reminderStateKey(REMINDER_JOB_STATES.PROCESSING),
        jobId, workerId, String(nowMs), String(REMINDER_LEASE_MS), String(REMINDER_JOB_TTL_SECONDS),
      ]]);
      const claimed = redisHashToJob(resultOf(reply) || []);
      if (claimed) return claimed;
    }
    return null;
  }

  async function transition(jobId, workerId, state, nextAt, fields, metaField = "") {
    const targetStateKey = reminderStateKey(state);
    const metaTime = fields.completionTime ?? fields.lastFailureAt ?? nextAt ?? "";
    const pairs = Object.entries(fields).flatMap(([key, value]) => [
      key,
      value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value),
    ]);
    const reply = await execute([[
      "EVAL", REMINDER_TRANSITION_LUA, String(5 + allStates.length),
      reminderJobKey(jobId), reminderLeaseKey(jobId), reminderQueueKey(), reminderMetaKey(),
      targetStateKey, ...stateKeys(),
      workerId, state, nextAt === null ? "" : String(nextAt), String(REMINDER_JOB_TTL_SECONDS),
      metaField, jobId, String(metaTime), ...pairs,
    ]]);
    if (Number(resultOf(reply)) !== 1) throw new Error("reminder job lease lost");
    return getJob(jobId);
  }

  async function appendReceipt(jobId, receipt) {
    const serialized = JSON.stringify(receipt);
    if (Buffer.byteLength(serialized, "utf8") > 1024) throw new Error("reminder receipt too large");
    const key = reminderReceiptKey(jobId);
    await execute([
      ["LPUSH", key, serialized],
      ["LTRIM", key, "0", String(REMINDER_RECEIPT_CAP - 1)],
      ["EXPIRE", key, String(REMINDER_RECEIPT_TTL_SECONDS)],
    ]);
  }

  const requeueBatch = (job, workerId, { cursor, summary, passTemporaryFailures, passRetryAfterMs, nowMs }) =>
    transition(job.jobId, workerId, REMINDER_JOB_STATES.QUEUED, nowMs, {
      cursor, resultSummary: summary, passTemporaryFailures, passRetryAfterMs, nextRetryAt: nowMs,
    });

  const scheduleRetry = (job, workerId, { nextRetryAt, summary, nowMs, reason }) =>
    transition(job.jobId, workerId, REMINDER_JOB_STATES.RETRY_PENDING, nextRetryAt, {
      cursor: "0", resultSummary: summary, nextRetryAt,
      firstFailureAt: job.firstFailureAt || nowMs, lastFailureAt: nowMs,
      sanitizedReason: reason,
    }, "lastFailedDispatch");

  const finalize = (job, workerId, { state, summary, nowMs, reason = null }) =>
    transition(job.jobId, workerId, state, null, {
      cursor: "0", resultSummary: summary, nextRetryAt: null, completionTime: nowMs,
      sanitizedReason: reason,
    }, state === REMINDER_JOB_STATES.DEAD_LETTER ? "lastFailedDispatch" : "lastSuccessfulDispatch");

  async function health(nowMs) {
    const commands = allStates.map((state) => ["SCARD", reminderStateKey(state)]);
    commands.push(["HGETALL", reminderMetaKey()]);
    commands.push(["SSCAN", reminderStateKey(REMINDER_JOB_STATES.QUEUED), "0", "COUNT", String(REMINDER_HEALTH_SAMPLE_CAP)]);
    commands.push(["SSCAN", reminderStateKey(REMINDER_JOB_STATES.RETRY_PENDING), "0", "COUNT", String(REMINDER_HEALTH_SAMPLE_CAP)]);
    commands.push(["SSCAN", reminderStateKey(REMINDER_JOB_STATES.PROCESSING), "0", "COUNT", "1"]);
    const reply = await execute(commands);
    const counts = Object.fromEntries(allStates.map((state, index) => [state, Number(resultOf(reply, index) || 0)]));
    const metaFlat = resultOf(reply, allStates.length) || [];
    const queuedScan = resultOf(reply, allStates.length + 1) || ["0", []];
    const retryScan = resultOf(reply, allStates.length + 2) || ["0", []];
    const processingScan = resultOf(reply, allStates.length + 3) || ["0", []];
    const meta = {};
    for (let index = 0; index + 1 < metaFlat.length; index += 2) meta[metaFlat[index]] = Number(metaFlat[index + 1]);
    let workerLease = { active: false };
    const processingId = processingScan?.[1]?.[0];
    if (processingId) {
      const leaseReply = await execute([
        ["GET", reminderLeaseKey(processingId)],
        ["PTTL", reminderLeaseKey(processingId)],
      ]);
      workerLease = {
        active: Boolean(resultOf(leaseReply)),
        jobId: processingId,
        ttlMs: Math.max(-1, Number(resultOf(leaseReply, 1))),
      };
    }
    let oldestQueuedAgeMs = null;
    const queuedIds = [...(queuedScan?.[1] || []), ...(retryScan?.[1] || [])]
      .slice(0, REMINDER_HEALTH_SAMPLE_CAP);
    for (const id of queuedIds) {
      const job = await getJob(id);
      if (!job) continue;
      const dueAt = job.state === REMINDER_JOB_STATES.RETRY_PENDING
        ? Number(job.nextRetryAt)
        : Number(job.scheduledTime);
      const age = Math.max(0, nowMs - dueAt);
      oldestQueuedAgeMs = oldestQueuedAgeMs === null ? age : Math.max(oldestQueuedAgeMs, age);
    }
    return {
      ready: true,
      environment: jobEnvironmentFromKey(reminderQueueKey()),
      counts,
      oldestQueuedAgeMs,
      lastSuccessfulDispatch: meta.lastSuccessfulDispatch || null,
      lastFailedDispatch: meta.lastFailedDispatch || null,
      workerLease,
    };
  }

  async function listDead(limit = REMINDER_DEAD_LIST_CAP) {
    const bounded = Math.max(1, Math.min(REMINDER_DEAD_LIST_CAP, Number(limit) || REMINDER_DEAD_LIST_CAP));
    const reply = await execute([[
      "SSCAN", reminderStateKey(REMINDER_JOB_STATES.DEAD_LETTER), "0", "COUNT", String(bounded),
    ]]);
    const ids = (resultOf(reply)?.[1] || []).slice(0, bounded);
    const jobs = [];
    for (const id of ids) {
      const job = await getJob(id);
      if (job) jobs.push(safeJobSummary(job));
    }
    return jobs;
  }

  async function adminAction(jobId, action, nowMs) {
    safeJobId(jobId);
    if (!["retry", "cancel", "resolve"].includes(action)) throw new Error("invalid reminder admin action");
    const newState = action === "retry" ? REMINDER_JOB_STATES.RETRY_PENDING : REMINDER_JOB_STATES.CANCELLED;
    const reply = await execute([[
      "EVAL", REMINDER_ADMIN_LUA, String(4 + allStates.length),
      reminderJobKey(jobId), reminderLeaseKey(jobId), reminderQueueKey(), reminderStateKey(newState),
      ...stateKeys(), action, String(nowMs), String(REMINDER_JOB_TTL_SECONDS), jobId,
    ]]);
    const job = redisHashToJob(resultOf(reply) || []);
    return job ? safeJobSummary(job) : null;
  }

  async function cleanup(limit = REMINDER_CLEANUP_LIMIT) {
    const bounded = Math.max(1, Math.min(REMINDER_CLEANUP_LIMIT, Number(limit) || REMINDER_CLEANUP_LIMIT));
    const perState = Math.max(1, Math.ceil(bounded / allStates.length));
    let examined = 0;
    let removed = 0;
    for (const state of allStates) {
      const scan = await execute([["SSCAN", reminderStateKey(state), "0", "COUNT", String(perState)]]);
      const ids = (resultOf(scan)?.[1] || []).slice(0, perState);
      for (const id of ids) {
        examined += 1;
        const exists = await execute([["EXISTS", reminderJobKey(id)]]);
        if (!Number(resultOf(exists))) {
          await execute([
            ["SREM", reminderStateKey(state), id],
            ["ZREM", reminderQueueKey(), id],
          ]);
          removed += 1;
        }
      }
      if (examined >= bounded) break;
    }
    return { examined, removed };
  }

  return {
    createJob, getJob, claimNext, appendReceipt, requeueBatch,
    scheduleRetry, finalize, health, listDead, adminAction, cleanup,
  };
}

function jobEnvironmentFromKey(key) {
  return String(key).split(":", 1)[0];
}
