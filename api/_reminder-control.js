import { createHash } from "node:crypto";
import { envNamespace, nsKey, PUSH_DELIVERY_RESULT } from "./_push-lib.js";

export const REMINDER_JOB_SCHEMA_VERSION = 1;
export const REMINDER_WINDOW_MS = 15 * 60 * 1000;
export const REMINDER_BATCH_SIZE = 100;
export const REMINDER_MAX_ATTEMPTS = 5;
export const REMINDER_LEASE_MS = 5 * 60 * 1000;
export const REMINDER_JOB_TTL_SECONDS = 30 * 24 * 60 * 60;
export const REMINDER_IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;
export const REMINDER_RECEIPT_TTL_SECONDS = 30 * 24 * 60 * 60;
export const REMINDER_RECEIPT_CAP = 500;
export const REMINDER_DEAD_LIST_CAP = 20;
export const REMINDER_HEALTH_SAMPLE_CAP = 20;
export const REMINDER_CLEANUP_LIMIT = 100;

export const REMINDER_JOB_STATES = Object.freeze({
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  RETRY_PENDING: "RETRY_PENDING",
  COMPLETED: "COMPLETED",
  PARTIAL_FAILURE: "PARTIAL_FAILURE",
  DEAD_LETTER: "DEAD_LETTER",
  CANCELLED: "CANCELLED",
});

export const REMINDER_TERMINAL_STATES = Object.freeze([
  REMINDER_JOB_STATES.COMPLETED,
  REMINDER_JOB_STATES.PARTIAL_FAILURE,
  REMINDER_JOB_STATES.DEAD_LETTER,
  REMINDER_JOB_STATES.CANCELLED,
]);

export const REMINDER_RETRY_SECONDS = Object.freeze([60, 5 * 60, 15 * 60, 60 * 60]);

const SUMMARY_FIELDS = Object.freeze([
  "checked", "targeted", "delivered", "deadRemoved", "temporaryFailures",
  "unexpectedFailures", "duplicates", "disabled", "locked", "invalidRecords",
]);

export function controlPlaneEnabled() {
  return process.env.REMINDER_CONTROL_PLANE_ENABLED === "true";
}

export function reminderEnvironment() {
  return envNamespace();
}

export function reminderQueueKey() { return nsKey("alhifz:reminder:jobs:queue"); }
export function reminderMetaKey() { return nsKey("alhifz:reminder:jobs:meta"); }
export function reminderStateKey(state) {
  if (!Object.values(REMINDER_JOB_STATES).includes(state)) throw new Error("invalid reminder job state");
  return nsKey(`alhifz:reminder:jobs:state:${state}`);
}
export function reminderJobKey(jobId) { return nsKey(`alhifz:reminder:job:${safeJobId(jobId)}`); }
export function reminderLeaseKey(jobId) { return nsKey(`alhifz:reminder:lease:${safeJobId(jobId)}`); }
export function reminderReceiptKey(jobId) { return nsKey(`alhifz:reminder:receipts:${safeJobId(jobId)}`); }
export function reminderIdempotencyKey(idempotencyKey) {
  if (!/^[a-f0-9]{64}$/.test(idempotencyKey)) throw new Error("invalid reminder idempotency key");
  return nsKey(`alhifz:reminder:idempotency:${idempotencyKey}`);
}

export function safeJobId(jobId) {
  if (typeof jobId !== "string" || !/^rj_[a-f0-9]{24}$/.test(jobId)) {
    throw new Error("invalid reminder job id");
  }
  return jobId;
}

export function reminderWindowStart(scheduledTime) {
  const value = Number(scheduledTime);
  if (!Number.isFinite(value) || value < 0) throw new Error("invalid scheduled time");
  return Math.floor(value / REMINDER_WINDOW_MS) * REMINDER_WINDOW_MS;
}

export function makeIdempotencyKey({ environment, reminderType, scheduledTime, sessionId = "all" }) {
  const stable = `${environment}|${reminderType}|${reminderWindowStart(scheduledTime)}|${sessionId}`;
  return createHash("sha256").update(stable).digest("hex");
}

export function emptyReminderSummary() {
  return Object.fromEntries(SUMMARY_FIELDS.map((field) => [field, 0]));
}

export function mergeReminderSummary(base, delta) {
  const merged = emptyReminderSummary();
  for (const field of SUMMARY_FIELDS) {
    const left = Number(base?.[field]);
    const right = Number(delta?.[field]);
    merged[field] = (Number.isFinite(left) ? Math.max(0, left) : 0) +
      (Number.isFinite(right) ? Math.max(0, right) : 0);
  }
  return merged;
}

export function makeReminderJob({
  scheduledTime,
  sourceTrigger,
  reminderType = "scheduled-reminders",
  sessionId = "all",
  createdAt = Date.now(),
} = {}) {
  const environment = reminderEnvironment();
  const exactScheduledTime = Number(scheduledTime ?? createdAt);
  if (!Number.isFinite(exactScheduledTime) || exactScheduledTime < 0) throw new Error("invalid scheduled time");
  const windowStart = reminderWindowStart(exactScheduledTime);
  if (typeof sourceTrigger !== "string" || !/^[a-z0-9_-]{1,32}$/i.test(sourceTrigger)) {
    throw new Error("invalid source trigger");
  }
  if (!/^[a-z0-9_-]{1,48}$/i.test(reminderType) || !/^[a-z0-9_-]{1,32}$/i.test(sessionId)) {
    throw new Error("invalid reminder descriptor");
  }
  const idempotencyKey = makeIdempotencyKey({ environment, reminderType, scheduledTime: windowStart, sessionId });
  return {
    schemaVersion: REMINDER_JOB_SCHEMA_VERSION,
    jobId: `rj_${idempotencyKey.slice(0, 24)}`,
    idempotencyKey,
    reminderType,
    sessionId,
    scheduledTime: exactScheduledTime,
    environment,
    createdAt: Number(createdAt),
    state: REMINDER_JOB_STATES.QUEUED,
    attemptCount: 0,
    nextRetryAt: exactScheduledTime,
    completionTime: null,
    cursor: "0",
    passTemporaryFailures: 0,
    passRetryAfterMs: 0,
    resultSummary: emptyReminderSummary(),
    sourceTrigger,
    firstFailureAt: null,
    lastFailureAt: null,
    sanitizedReason: null,
    manualRetryCount: 0,
    manualRetryAllowed: true,
    resolution: null,
  };
}

export function jobToRedisFields(job) {
  const fields = { ...job, resultSummary: JSON.stringify(job.resultSummary || emptyReminderSummary()) };
  return Object.entries(fields).flatMap(([key, value]) => [key, value === null ? "" : String(value)]);
}

export function redisHashToJob(flat) {
  if (!Array.isArray(flat) || flat.length === 0 || flat.length % 2 !== 0) return null;
  const raw = {};
  for (let index = 0; index < flat.length; index += 2) raw[flat[index]] = flat[index + 1];
  if (!raw.jobId) return null;
  let resultSummary;
  try { resultSummary = JSON.parse(raw.resultSummary || "{}"); } catch { resultSummary = emptyReminderSummary(); }
  const numberOrNull = (value) => value === "" || value === undefined ? null : Number(value);
  return {
    ...raw,
    schemaVersion: Number(raw.schemaVersion),
    scheduledTime: Number(raw.scheduledTime),
    createdAt: Number(raw.createdAt),
    attemptCount: Number(raw.attemptCount || 0),
    nextRetryAt: numberOrNull(raw.nextRetryAt),
    completionTime: numberOrNull(raw.completionTime),
    passTemporaryFailures: Number(raw.passTemporaryFailures || 0),
    passRetryAfterMs: Number(raw.passRetryAfterMs || 0),
    firstFailureAt: numberOrNull(raw.firstFailureAt),
    lastFailureAt: numberOrNull(raw.lastFailureAt),
    manualRetryCount: Number(raw.manualRetryCount || 0),
    manualRetryAllowed: raw.manualRetryAllowed !== "false",
    resultSummary,
  };
}

export function retryAfterMsFromError(error, nowMs = Date.now()) {
  const raw = error?.headers?.["retry-after"] ?? error?.headers?.["Retry-After"] ?? error?.retryAfter;
  if (raw === undefined || raw === null) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 24 * 60 * 60 * 1000);
  const date = Date.parse(String(raw));
  return Number.isFinite(date) ? Math.max(0, Math.min(date - nowMs, 24 * 60 * 60 * 1000)) : 0;
}

export function retryDelayMs({ attemptCount, retryAfterMs = 0, random = Math.random }) {
  const index = Math.min(Math.max(0, Number(attemptCount) - 1), REMINDER_RETRY_SECONDS.length - 1);
  const base = REMINDER_RETRY_SECONDS[index] * 1000;
  const sample = Math.max(0, Math.min(1, Number(random())));
  const jittered = Math.round(base * (0.8 + sample * 0.4));
  return Math.max(jittered, Math.max(0, Number(retryAfterMs) || 0));
}

export function makeDeliveryReceipt({
  targetRef,
  deliveryState,
  attemptNumber,
  providerStatus,
  timestamp,
  subscriptionRemoved = false,
  retryAllowed = false,
} = {}) {
  if (typeof targetRef !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(targetRef)) {
    throw new Error("invalid target reference");
  }
  if (!Object.values(PUSH_DELIVERY_RESULT).includes(deliveryState)) {
    throw new Error("invalid delivery state");
  }
  const status = Number(providerStatus);
  return {
    targetRef,
    deliveryState,
    attemptNumber: Math.max(1, Number(attemptNumber) || 1),
    providerStatusClass: Number.isInteger(status) ? `${Math.floor(status / 100)}xx` : "network",
    timestamp: Number(timestamp),
    subscriptionRemoved: Boolean(subscriptionRemoved),
    retryAllowed: Boolean(retryAllowed),
  };
}

export function safeJobSummary(job) {
  return {
    jobId: safeJobId(job.jobId),
    state: job.state,
    scheduledTime: Number(job.scheduledTime),
    attemptCount: Number(job.attemptCount || 0),
    nextRetryAt: job.nextRetryAt === null ? null : Number(job.nextRetryAt),
    completionTime: job.completionTime === null ? null : Number(job.completionTime),
    resultSummary: mergeReminderSummary({}, job.resultSummary),
    sourceTrigger: job.sourceTrigger,
    manualRetryAllowed: Boolean(job.manualRetryAllowed),
    sanitizedReason: job.sanitizedReason || null,
  };
}
