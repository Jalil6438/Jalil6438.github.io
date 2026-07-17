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
const validRecord = () => JSON.stringify({ revision: 4, snapshots: [{}], restoreOperations: [] });

function fakeRedis(records, { cursors = null, advanceTime = null } = {}) {
  const commands = [];
  let scanCall = 0;
  const fetchImpl = async (_url, options) => {
    advanceTime?.();
    const [command] = JSON.parse(options.body);
    commands.push(command);
    let result;
    if (command[0] === "SCAN") result = cursors?.[scanCall++] ?? ["0", [...records.keys()]];
    else if (command[0] === "GET") result = records.get(command[1]) ?? null;
    else if (command[0] === "EVAL") {
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
    setHeader() {},
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; },
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

test("authorization accepts only the exact bearer", () => {
  assert.equal(authorized(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(authorized("Bearer wrong", SECRET), false);
});

test("route is POST-only and hidden outside the exact Preview branch", async () => {
  assert.equal((await call({ method: "GET", direct: true })).statusCode, 405);
  process.env.VERCEL_ENV = "production";
  assert.equal((await call()).statusCode, 404);
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_GIT_COMMIT_REF = "other-branch";
  assert.equal((await call()).statusCode, 404);
});

test("zero records returns zero counts", async () => {
  const fake = fakeRedis(new Map());
  assert.deepEqual(await remediatePreview({ fetchImpl: fake.fetchImpl }), { scanned: 0, deleted: 0 });
});

test("exactly one well-formed record is atomically deleted", async () => {
  const fake = fakeRedis(new Map([[key("a"), validRecord()]]));
  assert.deepEqual(await remediatePreview({ fetchImpl: fake.fetchImpl }), { scanned: 1, deleted: 1 });
  assert.equal(fake.records.size, 0);
  assert.ok(fake.commands.filter((command) => command[0] === "SCAN")
    .every((command) => command[3] === `${PREFIX}*`));
});

test("more than one record fails closed before any fetch or deletion", async () => {
  const fake = fakeRedis(new Map([[key("a"), validRecord()], [key("b"), validRecord()]]));
  await assert.rejects(remediatePreview({ fetchImpl: fake.fetchImpl }), /multiple-records/);
  assert.equal(fake.records.size, 2);
  assert.equal(fake.commands.some((command) => ["GET", "EVAL"].includes(command[0])), false);
});

test("a malformed sole record fails closed without deletion", async () => {
  const fake = fakeRedis(new Map([[key("a"), "not-json"]]));
  await assert.rejects(remediatePreview({ fetchImpl: fake.fetchImpl }), /record-invalid/);
  assert.equal(fake.records.size, 1);
  assert.equal(fake.commands.some((command) => command[0] === "EVAL"), false);
});

test("scan page, key, and execution-time limits fail closed", async () => {
  const pageBound = fakeRedis(new Map(), { cursors: [["1", []], ["1", []]] });
  await assert.rejects(remediatePreview({ fetchImpl: pageBound.fetchImpl, limits: { maxPages: 1 } }), /scan-bounded/);
  const keyBound = fakeRedis(new Map([[key("a"), validRecord()]]));
  await assert.rejects(remediatePreview({ fetchImpl: keyBound.fetchImpl, limits: { maxKeys: 0 } }), /scan-bounded/);
  let clock = 0;
  const timeBound = fakeRedis(new Map(), { advanceTime: () => { clock += 10; } });
  await assert.rejects(remediatePreview({ fetchImpl: timeBound.fetchImpl, now: () => clock, limits: { maxMs: 5 } }), /execution-bounded/);
});

test("configuration, authorization, and request errors are sanitized", async () => {
  delete process.env.RECOVERY_REMEDIATION_SECRET;
  assert.equal((await call()).statusCode, 503);
  process.env.RECOVERY_REMEDIATION_SECRET = SECRET;
  assert.equal((await call({ authorization: "Bearer wrong" })).statusCode, 401);
  assert.equal((await call({ body: { action: "preview-synthetic-cleanup", pattern: "*" } })).statusCode, 400);
  assert.equal((await call({ body: { action: "preview-synthetic-cleanup", padding: "x".repeat(1100) } })).statusCode, 413);
});
