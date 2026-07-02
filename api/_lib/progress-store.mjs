// ── PROGRESS-BACKUP STORAGE ADAPTER (Phase 1, Phase E) ──
//
// A small, swappable interface so the shadow-backup route can be fully tested
// without a real datastore. Two implementations satisfy the same contract:
//   • createUpstashProgressStore() — production, Upstash Redis REST (the same
//     REST-pipeline pattern api/stats.js and api/_lib/store.mjs already use).
//   • createMemoryProgressStore()  — in-memory, deterministic, no network, with
//     fault injection for tests.
//
// ISOLATED NAMESPACE — everything lives under `alhifz:progress-backup:v1:` so it
// can never collide with push subscriptions (alhifz:push:*), stats
// (alhifz:reciters / alhifz:opens / alhifz:active:*), cron dedupe
// (alhifz:push:sent:*), or another app on the shared codebase. Keys use only
// opaque ids — never a name or email.
//
// (Files under api/_lib are NOT deployed as Vercel endpoints.)

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeConfigured = () => Boolean(REST_URL && REST_TOKEN);

export const NS = "alhifz:progress-backup:v1:";
export const kVerifier = (reciterId) => `${NS}verifier:${reciterId}`;
export const kIdem = (reciterId, key) => `${NS}idem:${reciterId}:${key}`;
export const kSnapshot = (reciterId, snapshotId) => `${NS}snap:${reciterId}:${snapshotId}`;
export const kLatest = (reciterId) => `${NS}latest:${reciterId}`;
export const kIndex = (reciterId) => `${NS}index:${reciterId}`;

// Retention / bounds (documented in docs/backend). Long TTLs are refreshed on
// each write, so an actively-backing device never expires while a truly
// abandoned reciter's data eventually ages out — no unbounded growth.
export const SNAPSHOT_TTL_SECONDS = 400 * 24 * 3600; // ~13 months
export const POINTER_TTL_SECONDS = 400 * 24 * 3600;
export const IDEMPOTENCY_TTL_SECONDS = 2 * 24 * 3600;
export const RECENT_INDEX_MAX = 20; // metadata-only ring; never unbounded

// Minimal Upstash REST pipeline (self-contained, mirrors api/_lib/store.mjs).
async function pipeline(commands) {
  const r = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  return r.json(); // [{ result }, ...]
}

function safeParse(raw) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createUpstashProgressStore() {
  return {
    async getVerifier(reciterId) {
      const out = await pipeline([["GET", kVerifier(reciterId)]]);
      const raw = out?.[0]?.result;
      return typeof raw === "string" ? raw : null;
    },

    // Trust-on-first-use claim: SET NX. true when WE set it (new reciter),
    // false when a verifier already existed (someone claimed it first).
    async claimVerifier(reciterId, verifierHex) {
      const out = await pipeline([
        ["SET", kVerifier(reciterId), verifierHex, "NX", "EX", String(POINTER_TTL_SECONDS)],
      ]);
      return out?.[0]?.result === "OK";
    },

    // SET NX EX — true only the FIRST time this idempotency key is seen.
    async claimIdempotencyKey(reciterId, key, ttlSeconds = IDEMPOTENCY_TTL_SECONDS) {
      const out = await pipeline([
        ["SET", kIdem(reciterId, key), "1", "NX", "EX", String(ttlSeconds)],
      ]);
      return out?.[0]?.result === "OK";
    },

    async saveSnapshot(reciterId, snapshotId, json, ttlSeconds = SNAPSHOT_TTL_SECONDS) {
      await pipeline([["SET", kSnapshot(reciterId, snapshotId), json, "EX", String(ttlSeconds)]]);
    },

    async pushRecentMetadata(reciterId, meta, max = RECENT_INDEX_MAX) {
      await pipeline([
        ["LPUSH", kIndex(reciterId), JSON.stringify(meta)],
        ["LTRIM", kIndex(reciterId), "0", String(max - 1)],
        ["EXPIRE", kIndex(reciterId), String(POINTER_TTL_SECONDS)],
      ]);
    },

    async getLatestSnapshotMetadata(reciterId) {
      const out = await pipeline([["GET", kLatest(reciterId)]]);
      return safeParse(out?.[0]?.result);
    },

    async setLatestSnapshotMetadata(reciterId, meta, ttlSeconds = POINTER_TTL_SECONDS) {
      await pipeline([["SET", kLatest(reciterId), JSON.stringify(meta), "EX", String(ttlSeconds)]]);
    },

    async listRecentSnapshotMetadata(reciterId, n = RECENT_INDEX_MAX) {
      const out = await pipeline([["LRANGE", kIndex(reciterId), "0", String(n - 1)]]);
      const arr = out?.[0]?.result;
      return Array.isArray(arr) ? arr.map(safeParse).filter(Boolean) : [];
    },
  };
}

// ── IN-MEMORY TEST ADAPTER ──
// Deterministic, no network. `faults` maps a method name → an Error to throw,
// so tests can prove "failed write does not advance the latest pointer" etc.
export function createMemoryProgressStore({ faults = {} } = {}) {
  const verifiers = new Map();
  const idem = new Map();
  const snapshots = new Map(); // `${reciterId}:${snapshotId}` -> json
  const latest = new Map();
  const index = new Map(); // reciterId -> [metaJson, ...] (newest first)

  const maybeFail = (name) => {
    if (faults[name]) throw faults[name];
  };

  return {
    // test introspection (not part of the production interface)
    _dump: () => ({ verifiers, idem, snapshots, latest, index }),

    async getVerifier(reciterId) {
      maybeFail("getVerifier");
      return verifiers.has(reciterId) ? verifiers.get(reciterId) : null;
    },
    async claimVerifier(reciterId, verifierHex) {
      maybeFail("claimVerifier");
      if (verifiers.has(reciterId)) return false;
      verifiers.set(reciterId, verifierHex);
      return true;
    },
    async claimIdempotencyKey(reciterId, key) {
      maybeFail("claimIdempotencyKey");
      const k = `${reciterId}:${key}`;
      if (idem.has(k)) return false;
      idem.set(k, "1");
      return true;
    },
    async saveSnapshot(reciterId, snapshotId, json) {
      maybeFail("saveSnapshot");
      snapshots.set(`${reciterId}:${snapshotId}`, json);
    },
    async pushRecentMetadata(reciterId, meta, max = RECENT_INDEX_MAX) {
      maybeFail("pushRecentMetadata");
      const list = index.get(reciterId) || [];
      list.unshift(JSON.stringify(meta));
      index.set(reciterId, list.slice(0, max));
    },
    async getLatestSnapshotMetadata(reciterId) {
      maybeFail("getLatestSnapshotMetadata");
      return latest.has(reciterId) ? safeParse(latest.get(reciterId)) : null;
    },
    async setLatestSnapshotMetadata(reciterId, meta) {
      maybeFail("setLatestSnapshotMetadata");
      latest.set(reciterId, JSON.stringify(meta));
    },
    async listRecentSnapshotMetadata(reciterId, n = RECENT_INDEX_MAX) {
      maybeFail("listRecentSnapshotMetadata");
      return (index.get(reciterId) || []).slice(0, n).map(safeParse).filter(Boolean);
    },
  };
}

// Production factory used by the route.
export function getProgressStore() {
  return createUpstashProgressStore();
}
