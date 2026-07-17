import test from "node:test";
import assert from "node:assert/strict";
import handler, { authorized, remediateSynthetic } from "../api/recovery/remediate-synthetic.js";

const PREFIX = "alhifz:recovery:v1:preview:record:";
const KEY = `${PREFIX}${"a".repeat(64)}`;
const SECRET = "temporary-preview-secret-32-bytes-minimum";
const REDIS_TOKEN = "redis-token-never-returned";

function syntheticState(overrides = {}) {
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

function redisFetch(records = new Map([[KEY, JSON.stringify(syntheticState())]])) {
  const commands = [];
  const fetchImpl = async (_url, options) => {
    const command = JSON.parse(options.body);
    commands.push(command);
    let result;
    if (command[0] === "SCAN") result = ["0", [...records.keys()]];
    else if (command[0] === "GET") result = records.get(command[1]) ?? null;
    else if (command[0] === "EVAL") {
      const current = records.get(command[3]);
      if (current === undefined) result = 0;
      else if (current !== command[4]) result = -1;
      else { records.delete(command[3]); result = 1; }
    } else throw new Error("unexpected command");
    return { ok: true, async json() { return { result }; } };
  };
  return { fetchImpl, commands, records };
}

function call({ method = "POST", body = { action: "cleanup" }, authorization = `Bearer ${SECRET}` } = {}) {
  const result = { statusCode: null, body: null };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; },
    setHeader() {},
  };
  return handler({ method, body, headers: { authorization } }, res).then(() => result);
}

test.beforeEach(() => {
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_GIT_COMMIT_REF = "work/al-hifz-progress-recovery-preview";
  process.env.RECOVERY_REMEDIATION_SECRET = SECRET;
  process.env.BACKUP_REDIS_REST_URL = "https://redis.example";
  process.env.BACKUP_REDIS_REST_TOKEN = REDIS_TOKEN;
});

test.afterEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_GIT_COMMIT_REF;
  delete process.env.RECOVERY_REMEDIATION_SECRET;
  delete process.env.BACKUP_REDIS_REST_URL;
  delete process.env.BACKUP_REDIS_REST_TOKEN;
});

test("constant-time authorization accepts only the exact bearer", () => {
  assert.equal(authorized(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(authorized("Bearer wrong", SECRET), false);
  assert.equal(authorized(undefined, SECRET), false);
});

test("route is POST-only and hidden outside the exact Preview branch", async () => {
  assert.equal((await call({ method: "GET" })).statusCode, 405);
  process.env.VERCEL_ENV = "production";
  assert.deepEqual(await call(), { statusCode: 404, body: { ok: false, error: "not found" } });
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_GIT_COMMIT_REF = "other-branch";
  assert.equal((await call()).statusCode, 404);
});

test("route fails closed on missing configuration and invalid authorization", async () => {
  delete process.env.RECOVERY_REMEDIATION_SECRET;
  assert.equal((await call()).statusCode, 503);
  process.env.RECOVERY_REMEDIATION_SECRET = SECRET;
  assert.deepEqual(await call({ authorization: "Bearer wrong" }), {
    statusCode: 401,
    body: { ok: false, error: "unauthorized" },
  });
});

test("route bounds and fixes the request body contract", async () => {
  assert.equal((await call({ body: { action: "cleanup", pattern: "*" } })).statusCode, 400);
  assert.equal((await call({ body: { action: "cleanup", padding: "x".repeat(1100) } })).statusCode, 413);
});

test("exact synthetic record is deleted atomically and a second run is empty", async () => {
  const fake = redisFetch();
  const first = await remediateSynthetic({ fetchImpl: fake.fetchImpl });
  assert.deepEqual(first, { scanned: 1, deleted: 1 });
  const second = await remediateSynthetic({ fetchImpl: fake.fetchImpl });
  assert.deepEqual(second, { scanned: 0, deleted: 0 });
  assert.equal(fake.records.size, 0);
  assert.ok(fake.commands.every((command) => JSON.stringify(command).includes("production") === false));
  assert.ok(fake.commands.filter((command) => command[0] === "SCAN")
    .every((command) => command[3] === `${PREFIX}*`));
});

test("ordinary records are ignored without deletion", async () => {
  const ordinaryKey = `${PREFIX}${"b".repeat(64)}`;
  const fake = redisFetch(new Map([[ordinaryKey, JSON.stringify({ snapshots: [], restoreOperations: [] })]]));
  assert.deepEqual(await remediateSynthetic({ fetchImpl: fake.fetchImpl }), { scanned: 0, deleted: 0 });
  assert.equal(fake.records.size, 1);
  assert.equal(fake.commands.some((command) => command[0] === "EVAL"), false);
});

test("partial synthetic markers, restore history, and malformed records fail closed", async () => {
  const partial = redisFetch(new Map([[KEY, JSON.stringify(syntheticState({
    snapshots: [{ envelope: { appVersion: "preview-smoke", backupId: "other", writerId: "other" } }],
  }))]]));
  await assert.rejects(remediateSynthetic({ fetchImpl: partial.fetchImpl }), /unexpected-synthetic-record/);
  assert.equal(partial.records.size, 1);

  const history = redisFetch(new Map([[KEY, JSON.stringify(syntheticState({ restoreOperations: [{}] }))]]));
  await assert.rejects(remediateSynthetic({ fetchImpl: history.fetchImpl }), /unexpected-synthetic-record/);
  assert.equal(history.records.size, 1);

  const malformed = redisFetch(new Map([[KEY, "not-json"]]));
  await assert.rejects(remediateSynthetic({ fetchImpl: malformed.fetchImpl }), /invalid-record/);
  assert.equal(malformed.records.size, 1);
});

test("responses and failures never expose secrets or record contents", async () => {
  const lines = [];
  const original = console.error;
  console.error = (...values) => lines.push(values.join(" "));
  try {
    const result = await call({ authorization: `Bearer ${REDIS_TOKEN}` });
    const output = JSON.stringify({ result, lines });
    assert.equal(output.includes(SECRET), false);
    assert.equal(output.includes(REDIS_TOKEN), false);
    assert.equal(output.includes("bkup_synthetic_source"), false);
  } finally {
    console.error = original;
  }
});
