import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/recovery/index.js";
import {
  authorized,
  handlePreviewCleanup,
  remediatePreview,
} from "../api/_recovery-preview-cleanup.js";

const PREFIX = "alhifz:recovery:v1:preview:record:";
const SECRET = "temporary-preview-secret-at-least-32-bytes";
const REDIS_TOKEN = "redis-token-never-returned";
const key = (character) => `${PREFIX}${character.repeat(64)}`;

function markedRecord(overrides = {}) {
  return {
    revision: 4,
    snapshots: [{
      envelope: {
        appVersion: "preview-smoke",
        backupId: "bkup_synthetic_source",
        writerId: "wrtr_synthetic_source",
      },
    }],
    restoreOperations: [],
    ...overrides,
  };
}

function fakeRedis(records, { cursors = null, advanceTime = null } = {}) {
  const commands = [];
  let scanCall = 0;
  const fetchImpl = async (_url, options) => {
    advanceTime?.();
    const [command] = JSON.parse(options.body);
    commands.push(command);
    let result;
    if (command[0] === "SCAN") {
      result = cursors?.[scanCall++] ?? ["0", [...records.keys()]];
    } else if (command[0] === "GET") {
      result = records.get(command[1]) ?? null;
    } else if (command[0] === "EVAL") {
      const current = records.get(command[3]);
      if (current === undefined) result = 0;
      else if (current !== command[4]) result = -1;
      else { records.delete(command[3]); result = 1; }
    } else throw new Error("unexpected command");
    return { ok: true, async json() { return [{ result }]; } };
  };
  return { fetchImpl, commands, records };
}

async function call({
  method = "POST",
  body = { action: "preview-synthetic-cleanup" },
  authorization = `Bearer ${SECRET}`,
  direct = false,
} = {}) {
  const result = { statusCode: null, body: null };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; },
    setHeader() {},
  };
  await (direct ? handlePreviewCleanup : handler)({ method, body, headers: { authorization } }, res);
  return result;
}

test.beforeEach(() => {
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_GIT_COMMIT_REF = "work/al-hifz-progress-recovery-preview";
  process.env.PROGRESS_RECOVERY_PLATFORM_ENABLED = "true";
  process.env.RECOVERY_REMEDIATION_SECRET = SECRET;
  process.env.BACKUP_REDIS_REST_URL = "https://redis.example";
  process.env.BACKUP_REDIS_REST_TOKEN = REDIS_TOKEN;
});

test.afterEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_GIT_COMMIT_REF;
  delete process.env.PROGRESS_RECOVERY_PLATFORM_ENABLED;
  delete process.env.RECOVERY_REMEDIATION_SECRET;
  delete process.env.BACKUP_REDIS_REST_URL;
  delete process.env.BACKUP_REDIS_REST_TOKEN;
});

test("authorization is constant-time and accepts only the exact bearer", () => {
  assert.equal(authorized(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(authorized("Bearer wrong", SECRET), false);
  assert.equal(authorized(undefined, SECRET), false);
});

test("route is POST-only and hidden outside the exact Preview branch and namespace", async () => {
  assert.equal((await call({ method: "GET", direct: true })).statusCode, 405);
  process.env.VERCEL_ENV = "production";
  assert.deepEqual(await call(), { statusCode: 404, body: { error: "not found" } });
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_GIT_COMMIT_REF = "other-branch";
  assert.equal((await call()).statusCode, 404);
});

test("route fails closed on configuration, authorization, and body errors", async () => {
  delete process.env.RECOVERY_REMEDIATION_SECRET;
  assert.equal((await call()).statusCode, 503);
  process.env.RECOVERY_REMEDIATION_SECRET = SECRET;
  assert.equal((await call({ authorization: "Bearer wrong" })).statusCode, 401);
  assert.equal((await call({ body: { action: "preview-synthetic-cleanup", pattern: "*" } })).statusCode, 400);
  assert.equal((await call({ body: { action: "preview-synthetic-cleanup", padding: "x".repeat(1100) } })).statusCode, 413);
});

test("one exact record is deleted atomically and the second run deletes zero", async () => {
  const records = new Map();
  for (let index = 0; index < 11; index += 1) {
    records.set(key(index.toString(16)), JSON.stringify({ snapshots: [], restoreOperations: [] }));
  }
  records.set(key("f"), JSON.stringify(markedRecord()));
  const fake = fakeRedis(records);
  assert.deepEqual(await remediatePreview({ fetchImpl: fake.fetchImpl }), { scanned: 12, deleted: 1 });
  assert.deepEqual(await remediatePreview({ fetchImpl: fake.fetchImpl }), { scanned: 11, deleted: 0 });
  assert.ok(fake.commands.filter((command) => command[0] === "SCAN")
    .every((command) => command[3] === `${PREFIX}*`));
  assert.equal(fake.commands.some((command) => JSON.stringify(command).includes("production")), false);
});

test("partial markers, restore history, malformed JSON, and ordinary records are never deleted", async () => {
  const records = new Map([
    [key("a"), JSON.stringify(markedRecord({ restoreOperations: [{}] }))],
    [key("b"), JSON.stringify(markedRecord({ snapshots: [{ envelope: { appVersion: "preview-smoke" } }] }))],
    [key("c"), "not-json"],
    [key("d"), JSON.stringify({ snapshots: [], restoreOperations: [] })],
  ]);
  const fake = fakeRedis(records);
  assert.deepEqual(await remediatePreview({ fetchImpl: fake.fetchImpl }), { scanned: 4, deleted: 0 });
  assert.equal(fake.records.size, 4);
  assert.equal(fake.commands.some((command) => command[0] === "EVAL"), false);
});

test("multiple exact matches fail closed without deleting either record", async () => {
  const records = new Map([
    [key("a"), JSON.stringify(markedRecord())],
    [key("b"), JSON.stringify(markedRecord())],
  ]);
  const fake = fakeRedis(records);
  await assert.rejects(remediatePreview({ fetchImpl: fake.fetchImpl }), /multiple-matches/);
  assert.equal(fake.records.size, 2);
  assert.equal(fake.commands.some((command) => command[0] === "EVAL"), false);
});

test("page, record, and execution-time limits fail closed", async () => {
  const pageBound = fakeRedis(new Map(), { cursors: [["1", []], ["1", []]] });
  await assert.rejects(remediatePreview({ fetchImpl: pageBound.fetchImpl, limits: { maxPages: 1 } }), /scan-bounded/);

  const recordBound = fakeRedis(new Map([[key("a"), "{}"], [key("b"), "{}"]]));
  await assert.rejects(remediatePreview({ fetchImpl: recordBound.fetchImpl, limits: { maxRecords: 1 } }), /scan-bounded/);

  let clock = 0;
  const timeBound = fakeRedis(new Map(), { advanceTime: () => { clock += 10; } });
  await assert.rejects(remediatePreview({ fetchImpl: timeBound.fetchImpl, now: () => clock, limits: { maxMs: 5 } }), /execution-bounded/);
});

test("responses and failures never expose credentials, keys, or record contents", async () => {
  const lines = [];
  const original = console.error;
  console.error = (...values) => lines.push(values.join(" "));
  try {
    const output = JSON.stringify({ result: await call({ authorization: `Bearer ${REDIS_TOKEN}` }), lines });
    assert.equal(output.includes(SECRET), false);
    assert.equal(output.includes(REDIS_TOKEN), false);
    assert.equal(output.includes("bkup_synthetic_source"), false);
    assert.equal(output.includes(PREFIX), false);
  } finally {
    console.error = original;
  }
});
