import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  REMINDER_JOB_STATES,
  REMINDER_RETRY_SECONDS,
  controlPlaneEnabled,
  makeDeliveryReceipt,
  makeReminderJob,
  redisHashToJob,
  reminderIdempotencyKey,
  reminderJobKey,
  reminderQueueKey,
  retryAfterMsFromError,
  retryDelayMs,
  safeJobSummary,
  jobToRedisFields,
} from "../api/_reminder-control.js";
import { PUSH_DELIVERY_RESULT } from "../api/_push-lib.js";

beforeEach(() => {
  process.env.VERCEL_ENV = "test";
  delete process.env.REMINDER_CONTROL_PLANE_ENABLED;
});

test("job creation is deterministic inside one environment and schedule window", () => {
  const first = makeReminderJob({ scheduledTime: 1_800_001, createdAt: 1_900_000, sourceTrigger: "qstash" });
  const duplicate = makeReminderJob({ scheduledTime: 1_899_999, createdAt: 1_999_000, sourceTrigger: "vercel-cron" });
  assert.equal(first.jobId, duplicate.jobId);
  assert.equal(first.idempotencyKey, duplicate.idempotencyKey);
  assert.equal(first.state, REMINDER_JOB_STATES.QUEUED);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.attemptCount, 0);
  assert.equal(first.environment, "test");
});

test("identical logical triggers are isolated by Production, Preview, and test namespaces", () => {
  process.env.VERCEL_ENV = "production";
  const production = makeReminderJob({ scheduledTime: 2_000_000, sourceTrigger: "qstash" });
  const productionKey = reminderJobKey(production.jobId);
  process.env.VERCEL_ENV = "preview";
  const preview = makeReminderJob({ scheduledTime: 2_000_000, sourceTrigger: "qstash" });
  const previewKey = reminderJobKey(preview.jobId);
  process.env.VERCEL_ENV = "test";
  const testing = makeReminderJob({ scheduledTime: 2_000_000, sourceTrigger: "qstash" });
  assert.notEqual(production.jobId, preview.jobId);
  assert.notEqual(preview.jobId, testing.jobId);
  assert.match(productionKey, /^prod:/);
  assert.match(previewKey, /^preview:/);
  assert.match(reminderQueueKey(), /^test:/);
  assert.match(reminderIdempotencyKey(testing.idempotencyKey), /^test:/);
});

test("feature flag is explicit and never silently enabled", () => {
  assert.equal(controlPlaneEnabled(), false);
  process.env.REMINDER_CONTROL_PLANE_ENABLED = "TRUE";
  assert.equal(controlPlaneEnabled(), false);
  process.env.REMINDER_CONTROL_PLANE_ENABLED = "true";
  assert.equal(controlPlaneEnabled(), true);
});

test("job hashes round-trip without leaking unbounded fields", () => {
  const job = makeReminderJob({ scheduledTime: 3_000_000, sourceTrigger: "qstash" });
  const restored = redisHashToJob(jobToRedisFields(job));
  assert.deepEqual(restored.resultSummary, job.resultSummary);
  assert.equal(restored.jobId, job.jobId);
  assert.equal(restored.state, REMINDER_JOB_STATES.QUEUED);
  assert.deepEqual(safeJobSummary(restored), {
    jobId: job.jobId,
    state: REMINDER_JOB_STATES.QUEUED,
    scheduledTime: job.scheduledTime,
    attemptCount: 0,
    nextRetryAt: job.nextRetryAt,
    completionTime: null,
    resultSummary: job.resultSummary,
    sourceTrigger: "qstash",
    manualRetryAllowed: true,
    sanitizedReason: null,
  });
});

test("retry schedule is staged, jitter-bounded, and honors Retry-After", () => {
  for (let attempt = 1; attempt <= REMINDER_RETRY_SECONDS.length; attempt += 1) {
    const base = REMINDER_RETRY_SECONDS[attempt - 1] * 1000;
    assert.equal(retryDelayMs({ attemptCount: attempt, random: () => 0 }), Math.round(base * 0.8));
    assert.equal(retryDelayMs({ attemptCount: attempt, random: () => 1 }), Math.round(base * 1.2));
  }
  const retryAfter = 10 * 60 * 1000;
  assert.equal(retryDelayMs({ attemptCount: 1, retryAfterMs: retryAfter, random: () => 0 }), retryAfter);
  assert.equal(retryAfterMsFromError({ headers: { "retry-after": "120" } }, 0), 120_000);
  assert.equal(retryAfterMsFromError({ headers: { "retry-after": "not-a-date" } }, 0), 0);
});

test("delivery receipts retain only bounded safe correlation fields", () => {
  const receipt = makeDeliveryReceipt({
    targetRef: "safe_target_123",
    deliveryState: PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE,
    attemptNumber: 2,
    providerStatus: 503,
    timestamp: 1234,
    retryAllowed: true,
    endpoint: "must-not-survive",
    authorization: "must-not-survive",
  });
  assert.deepEqual(receipt, {
    targetRef: "safe_target_123",
    deliveryState: PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE,
    attemptNumber: 2,
    providerStatusClass: "5xx",
    timestamp: 1234,
    subscriptionRemoved: false,
    retryAllowed: true,
  });
  assert.equal(JSON.stringify(receipt).includes("must-not-survive"), false);
});
