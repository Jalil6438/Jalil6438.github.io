// Durable backup storage over the Redis REST API.
//
// Redis keys contain only an environment namespace and SHA-256 digests. Raw
// capabilities, IP addresses, learner identifiers, and progress values never
// appear in a key or log message. Backup records remain values, protected by
// the capability-derived address and the provider's access controls.

import { createHash } from "node:crypto";

const REF_RE = /^[a-f0-9]{64}$/;
const MAX_COUNTER_NAME_LENGTH = 512;

// One Redis atom: read current revision, compare, write, and refresh retention.
// The marker also lets deterministic tests recognize this exact operation.
export const CAS_RECORD_LUA = `
-- ALHIFZ_BACKUP_CAS_V1
local raw = redis.call("GET", KEYS[1])
local current = -1
if raw then
  local decoded_ok, decoded = pcall(cjson.decode, raw)
  if not decoded_ok or type(decoded) ~= "table"
    or type(decoded["revision"]) ~= "number"
    or decoded["revision"] < 1
    or decoded["revision"] ~= math.floor(decoded["revision"]) then
    return {-1, -1}
  end
  current = decoded["revision"]
end
local expected = tonumber(ARGV[1])
if current ~= expected then
  return {0, current}
end
redis.call("SET", KEYS[1], ARGV[2], "PX", ARGV[3])
return {1, tonumber(ARGV[4])}
`;

export const INCR_WITH_TTL_LUA = `
-- ALHIFZ_BACKUP_COUNTER_V1
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

function durableError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw durableError("STORE_CONFIG_INVALID", "durable backup storage is not configured");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password
    || parsed.search || parsed.hash) {
    throw durableError("STORE_CONFIG_INVALID", "durable backup storage is not configured");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validRecord(record) {
  return record
    && typeof record === "object"
    && !Array.isArray(record)
    && Number.isInteger(record.revision)
    && record.revision >= 1
    && record.current
    && typeof record.current === "object"
    && Array.isArray(record.restorePoints);
}

function parseStoredRecord(raw) {
  if (raw === null) return null;
  if (typeof raw !== "string") {
    throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
  }
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
  }
  if (!validRecord(record)) {
    throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
  }
  return record;
}

function assertRef(ref) {
  if (typeof ref !== "string" || !REF_RE.test(ref)) {
    throw durableError("STORE_REQUEST_INVALID", "backup storage request is invalid");
  }
}

function assertCounterName(key) {
  if (typeof key !== "string" || key.length === 0 || key.length > MAX_COUNTER_NAME_LENGTH) {
    throw durableError("STORE_REQUEST_INVALID", "backup storage request is invalid");
  }
}

export function createRedisBackupAdapter({
  url,
  token,
  namespace,
  retentionMs,
  fetchImpl = globalThis.fetch,
  now = Date.now,
}) {
  const baseUrl = normalizedUrl(url);
  if (typeof token !== "string" || token.trim().length === 0
    || !["development", "preview", "production"].includes(namespace)
    || !Number.isSafeInteger(retentionMs) || retentionMs <= 0
    || typeof fetchImpl !== "function" || typeof now !== "function") {
    throw durableError("STORE_CONFIG_INVALID", "durable backup storage is not configured");
  }

  const keyPrefix = `alhifz:backup:v1:${namespace}`;
  const recordKey = (ref) => {
    assertRef(ref);
    return `${keyPrefix}:record:${digest(`record:${ref}`)}`;
  };
  const counterKey = (key) => {
    assertCounterName(key);
    return `${keyPrefix}:counter:${digest(`counter:${key}`)}`;
  };

  async function execute(command) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([command]),
      });
    } catch {
      throw durableError("STORE_UNAVAILABLE", "durable backup storage is unavailable");
    }

    if (!response || response.ok !== true || typeof response.json !== "function") {
      throw durableError("STORE_UNAVAILABLE", "durable backup storage is unavailable");
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
    }
    if (!Array.isArray(payload) || payload.length !== 1
      || !payload[0] || typeof payload[0] !== "object"
      || Object.hasOwn(payload[0], "error")
      || !Object.hasOwn(payload[0], "result")) {
      throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
    }
    return payload[0].result;
  }

  return {
    name: "redis",
    now,

    async getRecord(ref) {
      return parseStoredRecord(await execute(["GET", recordKey(ref)]));
    },

    async casPutRecord(ref, expectedRevision, record) {
      if (expectedRevision !== null
        && (!Number.isInteger(expectedRevision) || expectedRevision < 1)) {
        throw durableError("STORE_REQUEST_INVALID", "backup storage request is invalid");
      }
      if (!validRecord(record)) {
        throw durableError("STORE_REQUEST_INVALID", "backup storage request is invalid");
      }

      let serialized;
      try {
        serialized = JSON.stringify(record);
      } catch {
        throw durableError("STORE_REQUEST_INVALID", "backup storage request is invalid");
      }

      const result = await execute([
        "EVAL",
        CAS_RECORD_LUA,
        1,
        recordKey(ref),
        expectedRevision === null ? -1 : expectedRevision,
        serialized,
        retentionMs,
        record.revision,
      ]);

      if (!Array.isArray(result) || result.length !== 2
        || !Number.isInteger(result[0]) || !Number.isInteger(result[1])) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      if (result[0] === -1) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      if (result[0] === 0) {
        return { ok: false, revision: result[1] === -1 ? null : result[1] };
      }
      if (result[0] !== 1 || result[1] !== record.revision) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      return { ok: true, revision: result[1] };
    },

    async getExpiry(ref) {
      const ttl = await execute(["PTTL", recordKey(ref)]);
      if (!Number.isInteger(ttl)) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      if (ttl === -2) return null;
      if (ttl < 0) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      return now() + ttl;
    },

    async deleteRecord(ref) {
      const deleted = await execute(["DEL", recordKey(ref)]);
      if (deleted !== 0 && deleted !== 1) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      return deleted === 1;
    },

    async incr(key, ttlSeconds) {
      if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
        throw durableError("STORE_REQUEST_INVALID", "backup storage request is invalid");
      }
      const count = await execute([
        "EVAL",
        INCR_WITH_TTL_LUA,
        1,
        counterKey(key),
        ttlSeconds,
      ]);
      if (!Number.isSafeInteger(count) || count < 1) {
        throw durableError("STORE_RESPONSE_INVALID", "durable backup storage returned invalid data");
      }
      return count;
    },
  };
}
