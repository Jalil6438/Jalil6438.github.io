import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import recoveryRoute from "../api/recovery/index.js";
import { __resetStoreForTests } from "../api/_backup-store.js";
import { __resetIpPepper } from "../api/_backup-lib.js";
import { __resetRecoveryStoresForTests } from "../api/_recovery-store.js";
import { buildCloudEnvelope, canonicalStringify } from "../src/backup/cloudContract.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const TOKEN = `tok_${"r".repeat(39)}`;
const AUTH = `Bearer ${TOKEN}`;

async function envelope(ayahs = ["2:1"]) {
  return buildCloudEnvelope({
    payload: { "jalil-quran-v9": canonicalStringify(ayahs) },
    backupId: "bkup_route_1234",
    writerId: "wrtr_route_1234",
    appVersion: "1.6.0",
    platform: "web",
    createdAtIso: "2026-07-01T00:00:00.000Z",
    updatedAtIso: "2026-07-14T12:00:00.000Z",
    sha256Hex: hash,
  });
}

function call({ method = "POST", body = null, authorization = AUTH } = {}) {
  const result = { statusCode: null, body: null, headers: {} };
  const res = {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; },
  };
  return recoveryRoute({
    method,
    body,
    headers: { authorization, "x-forwarded-for": "192.0.2.10" },
  }, res).then(() => result);
}

beforeEach(() => {
  process.env.VERCEL_ENV = "development";
  process.env.BACKUP_ENABLED = "true";
  process.env.BACKUP_STORE_ADAPTER = "memory";
  process.env.BACKUP_IP_PEPPER = "unit-test-pepper-value";
  process.env.PROGRESS_RECOVERY_PLATFORM_ENABLED = "true";
  delete process.env.BACKUP_REDIS_REST_URL;
  delete process.env.BACKUP_REDIS_REST_TOKEN;
  __resetStoreForTests();
  __resetRecoveryStoresForTests();
  __resetIpPepper();
});

afterEach(() => {
  __resetStoreForTests();
  __resetRecoveryStoresForTests();
  __resetIpPepper();
});

test("feature-flagged route creates a backup and returns bounded health", async () => {
  const created = await call({ body: { action: "backup", envelope: await envelope() } });
  assert.equal(created.statusCode, 200);
  assert.equal(created.body.snapshot.completionState, "COMPLETE");
  assert.equal(Object.hasOwn(created.body.snapshot, "envelope"), false);
  const health = await call({ method: "GET" });
  assert.equal(health.statusCode, 200);
  assert.equal(health.body.health.snapshotCount, 1);
  assert.equal(health.body.health.environment, "development");
  assert.equal(JSON.stringify(health.body).includes("2:1"), false);
});

test("restore planning is read-only and returns a safe empty-local plan", async () => {
  const created = await call({ body: { action: "backup", envelope: await envelope(["2:1", "2:2"]) } });
  const empty = await envelope([]);
  const plan = await call({ body: {
    action: "plan",
    localEnvelope: empty,
    snapshotId: created.body.snapshot.snapshotId,
  } });
  assert.equal(plan.statusCode, 200);
  assert.equal(plan.body.plan.kind, "SAFE_FULL_RESTORE");
  const health = await call({ method: "GET" });
  assert.equal(health.body.health.snapshotCount, 1);
});

test("missing feature flag fails before authorization or storage", async () => {
  process.env.PROGRESS_RECOVERY_PLATFORM_ENABLED = "false";
  const result = await call({ body: { action: "backup", envelope: await envelope() }, authorization: "Bearer wrong" });
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, { ok: false, error: "recovery platform unavailable" });
});

test("missing capability, invalid environment, and storage config fail closed", async () => {
  let result = await call({ method: "GET", authorization: "Bearer wrong" });
  assert.equal(result.statusCode, 401);
  delete process.env.VERCEL_ENV;
  result = await call({ method: "GET" });
  assert.equal(result.statusCode, 503);
  assert.equal(JSON.stringify(result.body).includes(TOKEN), false);
  process.env.VERCEL_ENV = "preview";
  process.env.BACKUP_STORE_ADAPTER = "memory";
  result = await call({ method: "GET" });
  assert.equal(result.statusCode, 503);
});

test("malformed, unknown, oversized, and wrong-method requests are bounded", async () => {
  let result = await call({ body: { nope: true } });
  assert.equal(result.statusCode, 400);
  result = await call({ body: { action: "unknown" } });
  assert.equal(result.statusCode, 400);
  result = await call({ body: { action: "backup", padding: "x".repeat(3 * 1024 * 1024 + 10) } });
  assert.equal(result.statusCode, 413);
  result = await call({ method: "DELETE" });
  assert.equal(result.statusCode, 405);
});

test("responses and console never expose capabilities, IPs, or payloads", async () => {
  const lines = [];
  const original = console.error;
  console.error = (...args) => lines.push(args.join(" "));
  try {
    const result = await call({ body: { action: "backup", envelope: { payload: "private-progress" } } });
    const output = JSON.stringify({ result, lines });
    for (const forbidden of [TOKEN, "192.0.2.10", "private-progress", "BACKUP_REDIS_REST_TOKEN"]) {
      assert.equal(output.includes(forbidden), false);
    }
  } finally {
    console.error = original;
  }
});
