// ── APP UI NOTICE BUS (offline reliability) ──
//
// A tiny, dependency-free pub/sub so low-level modules (safeStorage, useAudio)
// can surface a RESTRAINED, non-blocking UI notice without importing React or
// threading callbacks through the tree. The single subscriber is OfflineStatus,
// which renders a small banner/pill. Notices carry ONLY safe metadata (a type
// and an optional key NAME) — never a payload, secret, or progress value.

const subscribers = new Set();

// Notice types the UI knows how to render. Kept as constants so producers and
// the renderer cannot drift.
export const NOTICE = Object.freeze({
  QUOTA: "storage-quota",         // a write failed because storage is full
  CORRUPT: "storage-corrupt",     // a key failed to parse and was salvaged
  UNAVAILABLE: "storage-unavailable", // localStorage cannot be used at all
  AUDIO_OFFLINE: "audio-offline", // audio could not load (offline/unreachable)
});

export function onAppNotice(cb) {
  if (typeof cb !== "function") return () => {};
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

// Emit a notice. Never throws — a broken subscriber can never break a producer
// (which may be inside a storage write on the critical path).
export function emitAppNotice(notice) {
  for (const cb of [...subscribers]) {
    try {
      cb(notice);
    } catch {
      /* a subscriber error must never propagate into storage/audio code */
    }
  }
}
