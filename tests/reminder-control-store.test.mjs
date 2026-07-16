import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  REMINDER_JOB_STATES,
  REMINDER_LEASE_MS,
  REMINDER_RECEIPT_CAP,
  REMINDER_RECEIPT_TTL_SECONDS,
  makeReminderJob,
  reminderJobKey,
  reminderQueueKey,
  reminderReceiptKey,
  reminderStateKey,
} from "../api/_reminder-control.js";
import {
  REMINDER_ADMIN_LUA,
  REMINDER_CLAIM_LUA,
  REMINDER_CREATE_LUA,
  REMINDER_TRANSITION_LUA,
  createReminderStore,
} from "../api/_reminder-store.js";

beforeEach(() => { process.env.VERCEL_ENV = "test"; });

function makeRedis() {
  const data = {
    now: 10_000,
    strings: new Map(),
    hashes: new Map(),
    sets: new Map(),
    zsets: new Map(),
    lists: new Map(),
    calls: [],
  };
  const hash = (key) => { if (!data.hashes.has(key)) data.hashes.set(key, new Map()); return data.hashes.get(key); };
  const set = (key) => { if (!data.sets.has(key)) data.sets.set(key, new Set()); return data.sets.get(key); };
  const zset = (key) => { if (!data.zsets.has(key)) data.zsets.set(key, new Map()); return data.zsets.get(key); };
  const liveString = (key) => {
    const entry = data.strings.get(key);
    if (entry && entry.expireAt !== null && entry.expireAt <= data.now) { data.strings.delete(key); return null; }
    return entry || null;
  };
  const hgetall = (key) => [...hash(key)].flat();
  const hsetPairs = (key, fields) => {
    const target = hash(key);
    for (let index = 0; index + 1 < fields.length; index += 2) target.set(String(fields[index]), String(fields[index + 1]));
  };

  function evalScript(command) {
    const script = command[1];
    const keyCount = Number(command[2]);
    const keys = command.slice(3, 3 + keyCount);
    const args = command.slice(3 + keyCount);
    if (script === REMINDER_CREATE_LUA) {
      const existing = liveString(keys[0]);
      if (existing) return [existing.value, "0"];
      if (data.hashes.has(keys[1]) && data.hashes.get(keys[1]).size) {
        data.strings.set(keys[0], { value: args[0], expireAt: data.now + Number(args[1]) * 1000 });
        return [args[0], "0"];
      }
      data.strings.set(keys[0], { value: args[0], expireAt: data.now + Number(args[1]) * 1000 });
      hsetPairs(keys[1], args.slice(4));
      zset(keys[2]).set(args[0], Number(args[3]));
      set(keys[3]).add(args[0]);
      hash(keys[4]).set("lastCreatedAt", String(args[3]));
      return [args[0], "1"];
    }
    if (script === REMINDER_CLAIM_LUA) {
      const [jobId, workerId, nowMs, leaseMs] = args;
      const score = zset(keys[0]).get(jobId);
      if (score === undefined || score > Number(nowMs) || liveString(keys[2])) return [];
      const job = hash(keys[1]);
      const priorState = job.get("state");
      if (!["QUEUED", "RETRY_PENDING", "PROCESSING"].includes(priorState)) return [];
      data.strings.set(keys[2], { value: workerId, expireAt: data.now + Number(leaseMs) });
      const cursor = job.get("cursor") || "0";
      if (cursor === "0" || priorState === "PROCESSING") {
        job.set("attemptCount", String(Number(job.get("attemptCount") || 0) + 1));
      }
      if (priorState === "PROCESSING") {
        if (!job.get("firstFailureAt")) job.set("firstFailureAt", nowMs);
        job.set("lastFailureAt", nowMs);
        job.set("sanitizedReason", "lease-expired");
      }
      if (cursor === "0") {
        job.set("passTemporaryFailures", "0");
        job.set("passRetryAfterMs", "0");
      }
      job.set("state", "PROCESSING");
      job.set("leaseUntil", String(Number(nowMs) + Number(leaseMs)));
      zset(keys[0]).set(jobId, Number(nowMs) + Number(leaseMs));
      set(keys[3]).delete(jobId); set(keys[4]).delete(jobId); set(keys[5]).add(jobId);
      return hgetall(keys[1]);
    }
    if (script === REMINDER_TRANSITION_LUA) {
      const [workerId, state, nextAt, , metaField, jobId, metaTime, ...fields] = args;
      if (liveString(keys[1])?.value !== workerId) return 0;
      for (const stateKey of keys.slice(5)) set(stateKey).delete(jobId);
      set(keys[4]).add(jobId);
      hsetPairs(keys[0], fields);
      hash(keys[0]).set("state", state);
      if (nextAt === "") zset(keys[2]).delete(jobId); else zset(keys[2]).set(jobId, Number(nextAt));
      if (metaField) hash(keys[3]).set(metaField, metaTime);
      data.strings.delete(keys[1]);
      return 1;
    }
    if (script === REMINDER_ADMIN_LUA) {
      const [action, nowMs, , jobId] = args;
      const job = hash(keys[0]);
      const state = job.get("state");
      let nextState;
      if (action === "retry") {
        if (state !== "DEAD_LETTER" || Number(job.get("manualRetryCount") || 0) >= 1) return [];
        nextState = "RETRY_PENDING";
        job.set("manualRetryCount", "1"); job.set("manualRetryAllowed", "false");
        job.set("attemptCount", "0"); job.set("cursor", "0"); job.set("nextRetryAt", nowMs);
        job.set("completionTime", ""); job.set("sanitizedReason", "manual-retry");
        zset(keys[2]).set(jobId, Number(nowMs));
      } else if (action === "cancel" || action === "resolve") {
        if (["COMPLETED", "PARTIAL_FAILURE", "CANCELLED"].includes(state)) return [];
        nextState = "CANCELLED";
        job.set("completionTime", nowMs); job.set("nextRetryAt", ""); job.set("resolution", action);
        job.set("manualRetryAllowed", "false"); job.set("sanitizedReason", action);
        zset(keys[2]).delete(jobId);
      } else return [];
      for (const stateKey of keys.slice(4)) set(stateKey).delete(jobId);
      set(keys[3]).add(jobId); job.set("state", nextState); data.strings.delete(keys[1]);
      return hgetall(keys[0]);
    }
    throw new Error("unknown Lua script");
  }

  function command(input) {
    const [operation, ...args] = input;
    switch (operation) {
      case "EVAL": return evalScript(input);
      case "HGETALL": return hgetall(args[0]);
      case "HSET": hsetPairs(args[0], args.slice(1)); return 1;
      case "HGET": return hash(args[0]).get(args[1]) ?? null;
      case "ZRANGEBYSCORE": return [...zset(args[0])].filter(([, score]) => score <= Number(args[2])).sort((a, b) => a[1] - b[1]).slice(0, Number(args[5])).map(([id]) => id);
      case "ZRANGE": {
        const values = [...zset(args[0])].sort((a, b) => a[1] - b[1]);
        return args.includes("WITHSCORES") && values.length ? [values[0][0], String(values[0][1])] : values.map(([id]) => id);
      }
      case "SCARD": return set(args[0]).size;
      case "SSCAN": return ["0", [...set(args[0])].slice(0, Number(args[3]))];
      case "SREM": return set(args[0]).delete(args[1]) ? 1 : 0;
      case "ZREM": return zset(args[0]).delete(args[1]) ? 1 : 0;
      case "GET": return liveString(args[0])?.value ?? null;
      case "PTTL": { const entry = liveString(args[0]); return entry?.expireAt === null ? -1 : entry ? entry.expireAt - data.now : -2; }
      case "EXISTS": return data.hashes.has(args[0]) && data.hashes.get(args[0]).size ? 1 : 0;
      case "LPUSH": { const list = data.lists.get(args[0]) || []; list.unshift(...args.slice(1).reverse()); data.lists.set(args[0], list); return list.length; }
      case "LTRIM": { const list = data.lists.get(args[0]) || []; data.lists.set(args[0], list.slice(Number(args[1]), Number(args[2]) + 1)); return "OK"; }
      case "EXPIRE": { const entry = data.strings.get(args[0]) || { value: "list", expireAt: null }; entry.expireAt = data.now + Number(args[1]) * 1000; data.strings.set(args[0], entry); return 1; }
      default: throw new Error(`unsupported fake Redis command ${operation}`);
    }
  }

  const execute = async (commands) => {
    data.calls.push(...commands);
    return commands.map((entry) => ({ result: command(entry) }));
  };
  return { data, execute, hash, set, zset };
}

test("create is durable and duplicate triggers resolve to the original job", async () => {
  const fake = makeRedis();
  const store = createReminderStore({ execute: fake.execute });
  const job = makeReminderJob({ scheduledTime: fake.data.now, sourceTrigger: "qstash" });
  const first = await store.createJob(job);
  const duplicate = await store.createJob({ ...job, sourceTrigger: "vercel-cron" });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.job.jobId, first.job.jobId);
  assert.equal(fake.zset(reminderQueueKey()).size, 1);
  assert.ok([...fake.data.strings.values()].some((entry) => entry.expireAt > fake.data.now));
});

test("atomic claim permits one worker and lease expiry permits crash recovery", async () => {
  const fake = makeRedis();
  const store = createReminderStore({ execute: fake.execute });
  const job = makeReminderJob({ scheduledTime: fake.data.now, sourceTrigger: "qstash" });
  await store.createJob(job);
  const first = await store.claimNext({ workerId: "worker_one", nowMs: fake.data.now });
  const blocked = await store.claimNext({ workerId: "worker_two", nowMs: fake.data.now });
  assert.equal(first.state, REMINDER_JOB_STATES.PROCESSING);
  assert.equal(first.attemptCount, 1);
  assert.equal(blocked, null);

  // A crash can happen after a batch cursor has advanced. Reclaiming the
  // expired PROCESSING lease must still consume an attempt.
  fake.hash(reminderJobKey(job.jobId)).set("cursor", "100");
  fake.data.now += REMINDER_LEASE_MS + 1;
  const recovered = await store.claimNext({ workerId: "worker_two", nowMs: fake.data.now });
  assert.equal(recovered.jobId, job.jobId);
  assert.equal(recovered.attemptCount, 2);
  assert.equal(recovered.firstFailureAt, fake.data.now);
  assert.equal(recovered.lastFailureAt, fake.data.now);
  assert.equal(recovered.sanitizedReason, "lease-expired");
});

test("normal multi-batch continuation does not consume a retry attempt", async () => {
  const fake = makeRedis();
  const store = createReminderStore({ execute: fake.execute });
  const job = makeReminderJob({ scheduledTime: fake.data.now, sourceTrigger: "qstash" });
  await store.createJob(job);
  const first = await store.claimNext({ workerId: "worker_one", nowMs: fake.data.now });
  await store.requeueBatch(first, "worker_one", {
    cursor: "100",
    summary: first.resultSummary,
    passTemporaryFailures: 0,
    passRetryAfterMs: 0,
    nowMs: fake.data.now,
  });
  const continued = await store.claimNext({ workerId: "worker_two", nowMs: fake.data.now });
  assert.equal(continued.cursor, "100");
  assert.equal(continued.attemptCount, 1);
});

test("bounded receipts carry retention and never grow beyond the cap", async () => {
  const fake = makeRedis();
  const store = createReminderStore({ execute: fake.execute });
  const job = makeReminderJob({ scheduledTime: fake.data.now, sourceTrigger: "qstash" });
  for (let index = 0; index < REMINDER_RECEIPT_CAP + 3; index += 1) {
    await store.appendReceipt(job.jobId, { targetRef: `t${index}`, deliveryState: "delivered" });
  }
  assert.equal(fake.data.lists.get(reminderReceiptKey(job.jobId)).length, REMINDER_RECEIPT_CAP);
  const ttlEntry = fake.data.strings.get(reminderReceiptKey(job.jobId));
  assert.equal(ttlEntry.expireAt, fake.data.now + REMINDER_RECEIPT_TTL_SECONDS * 1000);
});

test("dead-letter retry is one-time and cancellation is atomic", async () => {
  const fake = makeRedis();
  const store = createReminderStore({ execute: fake.execute });
  const job = makeReminderJob({ scheduledTime: fake.data.now, sourceTrigger: "qstash" });
  await store.createJob(job);
  const claimed = await store.claimNext({ workerId: "worker_one", nowMs: fake.data.now });
  await store.finalize(claimed, "worker_one", {
    state: REMINDER_JOB_STATES.DEAD_LETTER,
    summary: claimed.resultSummary,
    nowMs: fake.data.now,
    reason: "retry-exhausted",
  });
  const retry = await store.adminAction(job.jobId, "retry", fake.data.now + 1);
  assert.equal(retry.state, REMINDER_JOB_STATES.RETRY_PENDING);
  assert.equal(retry.manualRetryAllowed, false);

  const claimedAgain = await store.claimNext({ workerId: "worker_two", nowMs: fake.data.now + 1 });
  const cancelled = await store.adminAction(claimedAgain.jobId, "cancel", fake.data.now + 2);
  assert.equal(cancelled.state, REMINDER_JOB_STATES.CANCELLED);
  assert.equal(fake.zset(reminderQueueKey()).has(job.jobId), false);
});

test("health is bounded and cleanup removes only stale indexes", async () => {
  const fake = makeRedis();
  const store = createReminderStore({ execute: fake.execute });
  const job = makeReminderJob({ scheduledTime: fake.data.now, sourceTrigger: "qstash" });
  await store.createJob(job);
  fake.set(reminderStateKey(REMINDER_JOB_STATES.COMPLETED)).add("rj_aaaaaaaaaaaaaaaaaaaaaaaa");
  const health = await store.health(fake.data.now + 1000);
  assert.equal(health.ready, true);
  assert.equal(health.environment, "test");
  assert.equal(health.counts.QUEUED, 1);
  assert.ok(health.oldestQueuedAgeMs >= 0);
  const cleanup = await store.cleanup();
  assert.equal(cleanup.removed, 1);
  assert.equal(fake.hash(reminderJobKey(job.jobId)).get("state"), REMINDER_JOB_STATES.QUEUED);
});

test("storage outages reject operations without a memory fallback", async () => {
  const store = createReminderStore({ execute: async () => { throw new Error("transport detail"); } });
  const job = makeReminderJob({ scheduledTime: 1, sourceTrigger: "qstash" });
  await assert.rejects(() => store.createJob(job), /transport detail/);
});
