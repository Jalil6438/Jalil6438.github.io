// Backup persistence adapter selection (underscore prefix = not an endpoint).
//
// Every backup route talks only to this seam. Local tests may use the memory
// adapter, but Preview and Production require the durable Redis adapter and
// complete configuration. There is no hosted memory fallback.

import { createRedisBackupAdapter } from "./_backup-redis.js";

export const ADAPTER_MEMORY = "memory";
export const ADAPTER_REDIS = "redis";

export const RETENTION_DAYS = 400;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const MAX_RESTORE_POINTS = 3;

const HOSTED_ENVS = new Set(["preview", "production"]);
const KNOWN_ENVS = new Set(["development", ...HOSTED_ENVS]);

export function storeError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

export function selectedAdapterName() {
  return process.env.BACKUP_STORE_ADAPTER || ADAPTER_MEMORY;
}

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRedisConfig() {
  if (!configured(process.env.BACKUP_REDIS_REST_URL)
    || !configured(process.env.BACKUP_REDIS_REST_TOKEN)) {
    throw storeError("STORE_CONFIG_INVALID", "durable backup storage is not configured");
  }

  if (!configured(process.env.BACKUP_IP_PEPPER)
    || process.env.BACKUP_IP_PEPPER.length < 16) {
    throw storeError("STORE_CONFIG_INVALID", "durable backup storage is not configured");
  }
}

// Resolve and validate the complete storage policy before any adapter call.
// Hosted deployments are opt-in and Redis-only. An unknown VERCEL_ENV is never
// assigned a namespace because doing so could mix deployment data.
export function assertStoreAllowed() {
  const env = process.env.VERCEL_ENV;
  const adapterName = selectedAdapterName();
  const enabled = process.env.BACKUP_ENABLED;

  if (enabled !== undefined && enabled !== "true" && enabled !== "false") {
    throw storeError("STORE_CONFIG_INVALID", "progress backup configuration is invalid");
  }

  if (env !== undefined && !KNOWN_ENVS.has(env)) {
    throw storeError("STORE_CONFIG_INVALID", "progress backup environment is invalid");
  }

  if (HOSTED_ENVS.has(env)) {
    if (enabled !== "true") {
      throw storeError("BACKUP_DISABLED", "progress backup is disabled");
    }
    if (adapterName !== ADAPTER_REDIS) {
      throw storeError("ADAPTER_NOT_ALLOWED", "durable backup storage is required");
    }
    validateRedisConfig();
    return { adapterName, namespace: env };
  }

  if (enabled === "false") {
    throw storeError("BACKUP_DISABLED", "progress backup is disabled");
  }

  if (adapterName === ADAPTER_MEMORY) {
    return { adapterName, namespace: "local" };
  }

  if (adapterName !== ADAPTER_REDIS) {
    throw storeError("ADAPTER_NOT_ALLOWED", "backup storage adapter is not allowed");
  }

  // Redis is permitted locally only under an explicit development environment
  // and opt-in. This prevents an unset environment from reaching a shared store.
  if (env !== "development" || enabled !== "true") {
    throw storeError("STORE_CONFIG_INVALID", "durable backup storage is not configured");
  }
  validateRedisConfig();
  return { adapterName, namespace: env };
}

function createMemoryAdapter() {
  const records = new Map();
  const counters = new Map();
  let fixedNow = null;

  const now = () => (fixedNow === null ? Date.now() : fixedNow);
  const alive = (entry) => entry && entry.expiresAt > now();

  return {
    name: ADAPTER_MEMORY,
    now,

    async getRecord(ref) {
      const entry = records.get(ref);
      if (!alive(entry)) {
        if (entry) records.delete(ref);
        return null;
      }
      return structuredClone(entry.record);
    },

    async casPutRecord(ref, expectedRevision, record) {
      const entry = records.get(ref);
      const live = alive(entry) ? entry.record : null;
      const currentRevision = live ? live.revision : null;

      if (currentRevision !== expectedRevision) {
        return { ok: false, revision: currentRevision };
      }

      records.set(ref, {
        record: structuredClone(record),
        expiresAt: now() + RETENTION_MS,
      });
      return { ok: true, revision: record.revision };
    },

    async getExpiry(ref) {
      const entry = records.get(ref);
      return alive(entry) ? entry.expiresAt : null;
    },

    async deleteRecord(ref) {
      return records.delete(ref);
    },

    async incr(key, ttlSeconds) {
      const entry = counters.get(key);
      if (!alive(entry)) {
        counters.set(key, { count: 1, expiresAt: now() + ttlSeconds * 1000 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },

    setNow(ms) { fixedNow = ms; },
    reset() { records.clear(); counters.clear(); fixedNow = null; },
    size() { return records.size; },
  };
}

let memoryAdapter = null;
let redisAdapter = null;
let redisIdentity = null;

export function getStore() {
  const selection = assertStoreAllowed();
  if (selection.adapterName === ADAPTER_MEMORY) {
    if (!memoryAdapter) memoryAdapter = createMemoryAdapter();
    return memoryAdapter;
  }

  const identity = {
    url: process.env.BACKUP_REDIS_REST_URL,
    token: process.env.BACKUP_REDIS_REST_TOKEN,
    namespace: selection.namespace,
  };
  if (!redisAdapter
    || redisIdentity?.url !== identity.url
    || redisIdentity?.token !== identity.token
    || redisIdentity?.namespace !== identity.namespace) {
    redisAdapter = createRedisBackupAdapter({ ...identity, retentionMs: RETENTION_MS });
    redisIdentity = identity;
  }
  return redisAdapter;
}

export function __unsafeStoreForTests() {
  if (!memoryAdapter) memoryAdapter = createMemoryAdapter();
  return memoryAdapter;
}

export function __resetStoreForTests() {
  if (memoryAdapter) memoryAdapter.reset();
  redisAdapter = null;
  redisIdentity = null;
}
