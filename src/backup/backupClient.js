// ── OFFLINE-SAFE CLIENT BACKUP QUEUE (Phase 1, Phase H + M) ──
//
// Observes successful LOCAL progress persistence and, only when explicitly
// enabled, ships a validated snapshot to the shadow-backup endpoint. It is
// built to be invisible and harmless:
//   • DORMANT BY DEFAULT — created with { enabled:false } in Phase 1, so it
//     installs no listeners, runs no timers, and makes NO network request.
//     Existing local behavior is untouched whether the backend is off,
//     unavailable, or offline.
//   • never runs before the local write succeeds (it is called AFTER saves)
//   • debounces bursts, coalesces unchanged content (no duplicate snapshots)
//   • queues while offline, retries with bounded exponential backoff, stops
//     after a safe per-session cap, resumes on the `online` event
//   • never blocks the reciter, never alters local progress, never shows a
//     scary error — failures only update local, non-sensitive metrics
//   • persists its queue so one reload does not lose pending work, and is
//     bounded: when full it keeps the NEWEST snapshot, dropping the oldest
//
// The methodology data inside a snapshot is opaque here too — this module only
// reads allowlisted localStorage keys and never interprets progress.
import {
  buildSnapshotState, buildSnapshot, computeChecksum, MAX_SNAPSHOT_BYTES, byteLength,
} from "./snapshotCore.js";
import { loadOrCreateIdentity } from "./identity.js";

export const QUEUE_STORAGE_KEY = "alhifz:progress-backup:queue";
export const METRICS_STORAGE_KEY = "alhifz:progress-backup:metrics";

const DEFAULTS = {
  endpoint: "/api/progress/backup",
  debounceMs: 4000,     // coalesce a burst of saves into one snapshot
  maxRetries: 5,        // per queued item before it is quarantined
  backoffBaseMs: 2000,
  backoffMaxMs: 5 * 60 * 1000,
  maxPerSession: 50,    // safety cap on sends per app session
  queueMax: 10,         // bounded queue; keep newest on overflow
  appVersion: "1.0.0",
};

function readJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — backup is best-effort and must never throw */
  }
}

function defaultRandomId() {
  try {
    const a = new Uint8Array(16);
    globalThis.crypto.getRandomValues(a);
    let s = "";
    for (let i = 0; i < a.length; i++) s += (a[i] + 0x100).toString(16).slice(1);
    return s;
  } catch {
    return `s${String(Date.now())}0000000000000000`.slice(0, 32);
  }
}

function queueCategory(n) {
  if (n <= 0) return "empty";
  if (n <= 2) return "low";
  if (n < DEFAULTS.queueMax) return "medium";
  return "full";
}

// Create a backup client. All external effects are injectable so the whole
// thing is unit-testable with no real network, timers, or browser.
export function createBackupClient(userConfig = {}) {
  const cfg = { ...DEFAULTS, ...userConfig };
  const enabled = cfg.enabled === true; // strictly opt-in
  const storage = cfg.storage || (typeof localStorage !== "undefined" ? localStorage : null);
  const fetchImpl = cfg.fetch || (typeof fetch !== "undefined" ? fetch : null);
  const now = cfg.now || (() => (typeof Date !== "undefined" ? Date.now() : 0));
  const randomId = cfg.randomId || defaultRandomId;
  const isOnline = cfg.isOnline || (() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const scheduler = cfg.scheduler || {
    setTimeout: (fn, ms) => (typeof setTimeout !== "undefined" ? setTimeout(fn, ms) : null),
    clearTimeout: (h) => (typeof clearTimeout !== "undefined" ? clearTimeout(h) : undefined),
  };
  const getLocalDate = cfg.getLocalDate || (() => {
    try {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch { return null; }
  });
  const getTimezone = cfg.getTimezone || (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
  });

  // Runtime state
  let debounceHandle = null;
  let retryHandle = null;
  let sending = false;
  let sentThisSession = 0;
  let serverDisabled = false; // set if the server reports the gate is off
  let lastContentChecksum = null;
  let identity = null;

  const metrics = storage
    ? readJSON(storage, METRICS_STORAGE_KEY, null) || {}
    : {};
  const m = {
    successCount: metrics.successCount || 0,
    failureCount: metrics.failureCount || 0,
    droppedCount: metrics.droppedCount || 0,
    lastSuccessAt: metrics.lastSuccessAt || null,
    lastRevision: metrics.lastRevision || 0,
  };

  function persistMetrics() {
    if (storage) writeJSON(storage, METRICS_STORAGE_KEY, m);
  }

  // Keep only structurally-valid queue entries. A single corrupt/non-object
  // entry must never (a) wedge the head so nothing drains, nor (b) cause the
  // whole queue to be discarded — valid entries are preserved.
  function isValidQueueItem(it) {
    return Boolean(it && typeof it === "object" && it.snapshot && typeof it.snapshot === "object");
  }

  function loadQueue() {
    if (!storage) return [];
    const q = readJSON(storage, QUEUE_STORAGE_KEY, []);
    if (!Array.isArray(q)) return [];
    // Self-heal on every read: drop malformed entries (quarantine) and re-bound
    // to queueMax (keep newest), regardless of how the persisted blob was
    // produced. This makes the send path structurally unable to see a bad entry.
    const valid = q.filter(isValidQueueItem);
    return valid.length > cfg.queueMax ? valid.slice(valid.length - cfg.queueMax) : valid;
  }

  function saveQueue(q) {
    if (storage) writeJSON(storage, QUEUE_STORAGE_KEY, q);
  }

  // Purge malformed/overflow entries from the PERSISTED queue once, counting the
  // drops in metrics and rewriting storage. Called at start() and before each
  // enqueue so a corrupt persisted blob is cleaned rather than merely ignored.
  function sanitizeStoredQueue() {
    if (!storage) return;
    const raw = readJSON(storage, QUEUE_STORAGE_KEY, null);
    if (!Array.isArray(raw)) {
      // Whole-blob corruption (unparseable / non-array): nothing recoverable,
      // start clean. The newest snapshot is a full superset rebuilt on next save.
      if (raw !== null) saveQueue([]);
      return;
    }
    let cleaned = raw.filter(isValidQueueItem);
    if (cleaned.length > cfg.queueMax) cleaned = cleaned.slice(cleaned.length - cfg.queueMax);
    const dropped = raw.length - cleaned.length;
    if (dropped > 0) {
      m.droppedCount += dropped;
      saveQueue(cleaned);
      persistMetrics();
    }
  }

  function ensureIdentity() {
    if (!identity) identity = loadOrCreateIdentity(storage);
    return identity;
  }

  // Build a snapshot of the CURRENT local progress. Pure read of allowlisted
  // keys — never a write. Returns null when nothing can/should be sent.
  function buildCurrentSnapshot() {
    if (!storage) return null;
    const id = ensureIdentity();
    if (!id) return null;
    const state = buildSnapshotState((k) => storage.getItem(k));
    const checksum = computeChecksum(state);
    // Coalesce: identical content since the last enqueue → nothing to do.
    if (checksum === lastContentChecksum) return { unchanged: true, checksum };
    const revision = (m.lastRevision || 0) + 1;
    const snapshot = buildSnapshot({
      state,
      reciterId: id.reciterId,
      deviceId: id.deviceId,
      revision,
      createdAt: now(),
      localDate: getLocalDate(),
      timezone: getTimezone(),
      appVersion: cfg.appVersion,
      snapshotId: randomId(),
      // idempotencyKey defaults to `${revision}:${checksum}` inside buildSnapshot
    });
    return { unchanged: false, checksum, snapshot };
  }

  function enqueueCurrentSnapshot() {
    if (!enabled || serverDisabled) return;
    let built;
    try {
      built = buildCurrentSnapshot();
    } catch {
      return; // never let backup construction throw into the app
    }
    if (!built || built.unchanged || !built.snapshot) return;

    // Oversized guard — do not enqueue something the server would reject.
    if (byteLength(JSON.stringify(built.snapshot)) > MAX_SNAPSHOT_BYTES) return;

    lastContentChecksum = built.checksum;
    m.lastRevision = built.snapshot.revision;

    const q = loadQueue();
    // Drop any older queued item with the same checksum (coalesce duplicates).
    let next = q.filter((item) => item?.snapshot?.checksum !== built.checksum);
    next.push({ snapshot: built.snapshot, retries: 0 });
    // Bounded: keep the NEWEST cfg.queueMax, dropping the oldest.
    if (next.length > cfg.queueMax) {
      m.droppedCount += next.length - cfg.queueMax;
      next = next.slice(next.length - cfg.queueMax);
    }
    saveQueue(next);
    persistMetrics();
    flush();
  }

  async function attemptSendHead() {
    if (!enabled || serverDisabled || sending) return;
    if (!isOnline()) return; // offline — keep the queue, wait for `online`
    if (sentThisSession >= cfg.maxPerSession) return; // per-session safety cap
    const q = loadQueue();
    if (!q.length) return;
    const id = ensureIdentity();
    if (!id || !fetchImpl) return;

    const item = q[0];
    sending = true;
    try {
      const res = await fetchImpl(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: item.snapshot, secret: id.secret }),
        keepalive: true,
      });

      if (res && res.status === 503) {
        // Server gate is off (or store unconfigured) — stop; do not retry-loop.
        serverDisabled = true;
        sending = false;
        return;
      }

      let body = null;
      try { body = await res.json(); } catch { body = null; }

      if (res && res.ok && body && body.ok) {
        // ACK removes ONLY the acknowledged head item.
        const cur = loadQueue();
        if (cur[0]?.snapshot?.snapshotId === item.snapshot.snapshotId) cur.shift();
        saveQueue(cur);
        sentThisSession += 1;
        m.successCount += 1;
        m.lastSuccessAt = now();
        m.lastRevision = Math.max(m.lastRevision, item.snapshot.revision);
        persistMetrics();
        sending = false;
        // Continue draining the rest of the queue.
        if (cur.length) scheduleImmediate();
        return;
      }

      // Non-OK (e.g. 4xx invalid, 5xx transient) → count + backoff/quarantine.
      handleFailureHead();
    } catch {
      // Network error → retain item, backoff.
      handleFailureHead();
    } finally {
      sending = false;
    }
  }

  function handleFailureHead() {
    const q = loadQueue();
    if (!q.length) return;
    q[0].retries = (q[0].retries || 0) + 1;
    m.failureCount += 1;
    if (q[0].retries > cfg.maxRetries) {
      // Quarantine: drop this one item safely (local progress is untouched)
      // so a permanently-bad item cannot wedge the whole queue.
      q.shift();
      m.droppedCount += 1;
      saveQueue(q);
      persistMetrics();
      scheduleImmediate();
      return;
    }
    saveQueue(q);
    persistMetrics();
    const delay = Math.min(cfg.backoffMaxMs, cfg.backoffBaseMs * Math.pow(2, q[0].retries - 1));
    if (retryHandle) scheduler.clearTimeout(retryHandle);
    retryHandle = scheduler.setTimeout(() => { retryHandle = null; attemptSendHead(); }, delay);
  }

  function scheduleImmediate() {
    if (retryHandle) scheduler.clearTimeout(retryHandle);
    retryHandle = scheduler.setTimeout(() => { retryHandle = null; attemptSendHead(); }, 0);
  }

  // Public: try to drain the queue now (no-op when dormant/offline/capped).
  function flush() {
    if (!enabled || serverDisabled) return;
    attemptSendHead();
  }

  // Public: called AFTER a successful local progress save. Debounced so a
  // burst of saves produces a single snapshot.
  function notifyProgressChanged() {
    if (!enabled || serverDisabled) return;
    if (debounceHandle) scheduler.clearTimeout(debounceHandle);
    debounceHandle = scheduler.setTimeout(() => {
      debounceHandle = null;
      enqueueCurrentSnapshot();
    }, cfg.debounceMs);
  }

  let onlineHandler = null;
  function start() {
    if (!enabled) return; // DORMANT: no listeners, no timers, no requests
    if (typeof window !== "undefined" && window.addEventListener && !onlineHandler) {
      onlineHandler = () => flush();
      window.addEventListener("online", onlineHandler);
    }
    // Clean any malformed/overflow entries left in a persisted queue (counting
    // the drops) before resuming, so a corrupt blob can never wedge the drain.
    sanitizeStoredQueue();
    // Resume any work persisted from a previous session.
    flush();
  }

  function stop() {
    if (debounceHandle) scheduler.clearTimeout(debounceHandle);
    if (retryHandle) scheduler.clearTimeout(retryHandle);
    debounceHandle = retryHandle = null;
    if (onlineHandler && typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("online", onlineHandler);
      onlineHandler = null;
    }
  }

  // Safe, non-sensitive metrics (Phase M). No ids, payloads, secrets, or PII.
  function getMetrics() {
    let qlen = 0;
    try { qlen = loadQueue().length; } catch { qlen = 0; }
    return {
      enabled,
      serverDisabled,
      successCount: m.successCount,
      failureCount: m.failureCount,
      droppedCount: m.droppedCount,
      lastSuccessAt: m.lastSuccessAt,
      lastRevision: m.lastRevision,
      queueLength: qlen,
      queueLengthCategory: queueCategory(qlen),
    };
  }

  return {
    enabled,
    notifyProgressChanged,
    flush,
    start,
    stop,
    getMetrics,
    // Exposed for unit tests — drive the state machine deterministically.
    _internal: {
      buildCurrentSnapshot,
      enqueueCurrentSnapshot,
      attemptSendHead,
      handleFailureHead,
      loadQueue,
      saveQueue,
      setServerDisabled: (v) => { serverDisabled = v; },
      getServerDisabled: () => serverDisabled,
    },
  };
}

// A no-op stand-in used wherever the app wants a stable handle without
// activating anything (keeps call sites clean while the feature is dormant).
export const inertBackupClient = Object.freeze({
  enabled: false,
  notifyProgressChanged() {},
  flush() {},
  start() {},
  stop() {},
  getMetrics() { return { enabled: false }; },
});
