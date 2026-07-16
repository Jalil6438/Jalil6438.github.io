import { createHash } from "node:crypto";
import { RETENTION_MS } from "./_backup-store.js";
import { RECOVERY_OPERATION_CAP, RECOVERY_RECORD_VERSION, RECOVERY_SNAPSHOT_CAP, recoveryEnvironment, recoveryError } from "./_recovery-model.js";

export const RECOVERY_CAS_LUA = `-- ALHIFZ_RECOVERY_CAS_V1
local raw = redis.call('GET', KEYS[1])
local current = 0
if raw then
  local ok, decoded = pcall(cjson.decode, raw)
  if not ok or type(decoded) ~= 'table' or type(decoded['revision']) ~= 'number' then return {-1, -1} end
  current = decoded['revision']
end
if current ~= tonumber(ARGV[1]) then return {0, current} end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
return {1, tonumber(ARGV[4])}`;

const REF_RE = /^[a-f0-9]{64}$/;
const stores = new Map();

function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function assertRef(ref) {
  if (!REF_RE.test(ref || "")) throw recoveryError("RECOVERY_REQUEST_INVALID", "invalid backup reference");
}

function validState(state) {
  return state && typeof state === "object" && !Array.isArray(state)
    && state.recordVersion === RECOVERY_RECORD_VERSION
    && Number.isInteger(state.revision) && state.revision >= 0
    && Array.isArray(state.snapshots) && state.snapshots.length <= RECOVERY_SNAPSHOT_CAP
    && Array.isArray(state.restoreOperations) && state.restoreOperations.length <= RECOVERY_OPERATION_CAP;
}

function parseState(raw) {
  if (raw === null) return null;
  if (typeof raw !== "string") throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
  let value;
  try { value = JSON.parse(raw); } catch { throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data"); }
  if (!validState(value)) throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
  return value;
}

export function createRecoveryMemoryStore({ namespace = recoveryEnvironment(), now = Date.now } = {}) {
  const records = new Map();
  const expiries = new Map();
  const key = (ref) => { assertRef(ref); return `${namespace}:${digest(`recovery:${ref}`)}`; };
  const live = (recordKey) => {
    if (records.has(recordKey) && expiries.get(recordKey) <= now()) {
      records.delete(recordKey);
      expiries.delete(recordKey);
    }
    return records.get(recordKey) || null;
  };
  return {
    name: "memory", namespace, now,
    async get(ref) { return structuredClone(live(key(ref))); },
    async cas(ref, expectedRevision, state) {
      const recordKey = key(ref);
      const current = live(recordKey);
      const revision = current?.revision || 0;
      if (revision !== expectedRevision) return { ok: false, revision };
      if (!validState(state) || state.revision !== expectedRevision + 1) {
        throw recoveryError("RECOVERY_REQUEST_INVALID", "invalid recovery state");
      }
      records.set(recordKey, structuredClone(state));
      expiries.set(recordKey, now() + RETENTION_MS);
      return { ok: true, revision: state.revision };
    },
    async getExpiry(ref) { const recordKey = key(ref); return live(recordKey) ? expiries.get(recordKey) : null; },
    async delete(ref) {
      const recordKey = key(ref);
      const existed = records.delete(recordKey);
      expiries.delete(recordKey);
      return existed;
    },
    __records: records,
  };
}

export function createRecoveryRedisStore({ url, token, namespace = recoveryEnvironment(), fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  let baseUrl;
  try { baseUrl = new URL(url); } catch { throw recoveryError("RECOVERY_CONFIG_INVALID", "recovery storage is not configured"); }
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash
    || typeof token !== "string" || token.trim().length === 0
    || !["production", "preview", "development"].includes(namespace)
    || typeof fetchImpl !== "function") {
    throw recoveryError("RECOVERY_CONFIG_INVALID", "recovery storage is not configured");
  }
  const prefix = `alhifz:recovery:v1:${namespace}`;
  const key = (ref) => { assertRef(ref); return `${prefix}:record:${digest(`record:${ref}`)}`; };
  async function execute(command) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl.toString().replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([command]),
      });
    } catch { throw recoveryError("RECOVERY_STORE_UNAVAILABLE", "recovery storage is unavailable"); }
    if (!response?.ok || typeof response.json !== "function") throw recoveryError("RECOVERY_STORE_UNAVAILABLE", "recovery storage is unavailable");
    let body;
    try { body = await response.json(); } catch { throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data"); }
    if (!Array.isArray(body) || body.length !== 1 || !body[0] || Object.hasOwn(body[0], "error")) {
      throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
    }
    return body[0].result;
  }
  return {
    name: "redis", namespace, now,
    async get(ref) { return parseState(await execute(["GET", key(ref)])); },
    async cas(ref, expectedRevision, state) {
      if (!validState(state) || state.revision !== expectedRevision + 1) throw recoveryError("RECOVERY_REQUEST_INVALID", "invalid recovery state");
      const result = await execute(["EVAL", RECOVERY_CAS_LUA, 1, key(ref), expectedRevision, JSON.stringify(state), RETENTION_MS, state.revision]);
      if (!Array.isArray(result) || result.length !== 2 || !Number.isInteger(result[0]) || !Number.isInteger(result[1])) {
        throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
      }
      if (result[0] === -1) throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
      return result[0] === 1 ? { ok: true, revision: result[1] } : { ok: false, revision: result[1] };
    },
    async getExpiry(ref) {
      const ttl = await execute(["PTTL", key(ref)]);
      if (!Number.isInteger(ttl) || ttl < -2 || ttl === -1) throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
      return ttl === -2 ? null : now() + ttl;
    },
    async delete(ref) {
      const removed = await execute(["DEL", key(ref)]);
      if (!Number.isInteger(removed) || removed < 0 || removed > 1) {
        throw recoveryError("RECOVERY_STORE_INVALID", "recovery storage returned invalid data");
      }
      return removed === 1;
    },
  };
}

export function getRecoveryStore() {
  const env = recoveryEnvironment();
  const adapter = process.env.BACKUP_STORE_ADAPTER || "memory";
  if ((env === "production" || env === "preview") && adapter !== "redis") {
    throw recoveryError("RECOVERY_CONFIG_INVALID", "durable recovery storage is required");
  }
  const identity = `${env}|${adapter}|${process.env.BACKUP_REDIS_REST_URL || ""}|${process.env.BACKUP_REDIS_REST_TOKEN || ""}`;
  if (stores.has(identity)) return stores.get(identity);
  let store;
  if (adapter === "memory" && (env === "development" || env === "test")) {
    store = createRecoveryMemoryStore({ namespace: env });
  } else if (adapter === "redis") {
    store = createRecoveryRedisStore({
      url: process.env.BACKUP_REDIS_REST_URL,
      token: process.env.BACKUP_REDIS_REST_TOKEN,
      namespace: env,
    });
  } else {
    throw recoveryError("RECOVERY_CONFIG_INVALID", "recovery storage is not configured");
  }
  stores.set(identity, store);
  return store;
}

export function __resetRecoveryStoresForTests() { stores.clear(); }
