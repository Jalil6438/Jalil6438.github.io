// ── BACKUP PERSISTENCE ADAPTER (underscore prefix = not an endpoint) ──
//
// The storage seam. Every backup endpoint talks to this interface and nothing
// else, so the persistence layer can be swapped (Redis, Postgres, object store)
// without a single handler changing.
//
// ── WHAT THIS FILE DELIBERATELY CANNOT DO ─────────────────────────────────
// This foundation ships ONE adapter: in-memory. It performs no network I/O and
// holds no credentials, so it is structurally incapable of reaching Production
// Redis — the property is enforced by the code's absence, not by a flag someone
// can flip. On top of that, `assertStoreAllowed()` FAILS CLOSED on
// VERCEL_ENV=production and on any adapter name other than "memory", so even if
// a Redis adapter is added later it cannot be pointed at Production by accident.
// Both guards are asserted in tests/cloud-backup-api.test.mjs.
//
// Consequence, stated plainly: data written here lives in one serverless
// instance's heap and vanishes on cold start. That is correct for a foundation
// packet. It is NOT a shippable backend, and no user-facing backup feature may
// be enabled until a durable adapter lands (docs/PROGRESS_BACKUP_ARCHITECTURE.md,
// "Next packet").

export const ADAPTER_MEMORY = "memory";

// Retention: a backup nobody has touched in this long is deleted. Justified in
// the retention policy — long enough to survive a lost phone plus a slow
// replacement, short enough that abandoned data does not accumulate forever.
export const RETENTION_DAYS = 400;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Restore points kept BEHIND the current backup. Three covers the realistic
// failure — "yesterday's sync ate my progress, give me the one before" — while
// bounding per-user storage at 4 envelopes.
export const MAX_RESTORE_POINTS = 3;

export function storeError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

export function selectedAdapterName() {
  return process.env.BACKUP_STORE_ADAPTER || ADAPTER_MEMORY;
}

// FAIL CLOSED. Called by every handler before any store access.
//
// Mirrors the envNamespace() discipline in api/_push-lib.js: an unexpected
// environment is an error, never a silent default to something shared.
export function assertStoreAllowed() {
  if (process.env.VERCEL_ENV === "production") {
    throw storeError(
      "PRODUCTION_LOCKED",
      "progress backup is a foundation packet and is disabled in production",
    );
  }
  const name = selectedAdapterName();
  if (name !== ADAPTER_MEMORY) {
    throw storeError("ADAPTER_NOT_ALLOWED", `adapter "${name}" is not permitted in this packet`);
  }
}

// ── In-memory adapter ─────────────────────────────────────────────────────
//
// The clock is injectable (`setNow`) so retention and rate-limit expiry are
// tested deterministically instead of with sleeps — the same technique
// tests/reminder-dispatch.test.mjs uses for its Redis mock.

function createMemoryAdapter() {
  const records = new Map(); // ref -> { record, expiresAt }
  const counters = new Map(); // key -> { count, expiresAt }
  let fixedNow = null;

  const now = () => (fixedNow === null ? Date.now() : fixedNow);

  // Lazy expiry: nothing sweeps in the background, so every read checks. A real
  // adapter gets this from the datastore's own TTL.
  const alive = (entry) => entry && entry.expiresAt > now();

  return {
    name: ADAPTER_MEMORY,
    now,

    async getRecord(ref) {
      const entry = records.get(ref);
      if (!alive(entry)) {
        if (entry) records.delete(ref); // expired: actually gone, not just hidden
        return null;
      }
      // Deep copy on the way out. Handlers must never hold a live reference into
      // the store — an accidental mutation would "write" without a putRecord.
      return structuredClone(entry.record);
    },

    async putRecord(ref, record) {
      // Every successful write refreshes the retention clock, including a no-op
      // re-put of identical content. Retention is "untouched for RETENTION_DAYS",
      // not "unchanged for RETENTION_DAYS" — a user who keeps syncing a finished
      // muṣḥaf must not have the backup expire out from under them just because
      // the bytes stopped changing.
      records.set(ref, {
        record: structuredClone(record),
        expiresAt: now() + RETENTION_MS,
      });
    },

    // When this backup will be deleted if untouched. Surfaced by the data-export
    // endpoint: "we hold this, and here is when it goes away" is part of an
    // honest answer to a data-access request.
    async getExpiry(ref) {
      const entry = records.get(ref);
      return alive(entry) ? entry.expiresAt : null;
    },

    async deleteRecord(ref) {
      return records.delete(ref);
    },

    // Rate-limit hook: fixed-window counter, INCR + EXPIRE-if-new. Same shape as
    // the Upstash limiter in api/push/subscribe.js so a Redis adapter is a
    // drop-in.
    async incr(key, ttlSeconds) {
      const entry = counters.get(key);
      if (!alive(entry)) {
        counters.set(key, { count: 1, expiresAt: now() + ttlSeconds * 1000 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },

    // ── test-only ──
    setNow(ms) { fixedNow = ms; },
    reset() { records.clear(); counters.clear(); fixedNow = null; },
    size() { return records.size; },
  };
}

// One instance per process. Module-scope on purpose: within a warm serverless
// instance successive requests see the same heap, which is what makes the
// endpoints exercisable end-to-end in tests.
let adapter = null;

export function getStore() {
  assertStoreAllowed();
  if (!adapter) adapter = createMemoryAdapter();
  return adapter;
}

// Tests reach for this directly to seed, advance the clock, and reset between
// cases without going through assertStoreAllowed().
export function __unsafeStoreForTests() {
  if (!adapter) adapter = createMemoryAdapter();
  return adapter;
}
