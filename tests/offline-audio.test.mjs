// OFFLINE — audio UX (R7/R9/R16) + the app-notice bus.
// useAudio is a React hook (no jsdom here), so its offline WIRING is checked by
// source assertion, while the notice bus it uses is unit-tested behaviourally.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { onAppNotice, emitAppNotice, NOTICE } from "../src/appEvents.js";

const AUDIO_SRC = readFileSync(fileURLToPath(new URL("../src/hooks/useAudio.js", import.meta.url)), "utf8");
const STATUS_SRC = readFileSync(fileURLToPath(new URL("../src/components/OfflineStatus.jsx", import.meta.url)), "utf8");

// ── app-notice bus ──
test("onAppNotice receives emitted notices; unsubscribe stops delivery", () => {
  const got = [];
  const off = onAppNotice((n) => got.push(n));
  emitAppNotice({ type: NOTICE.AUDIO_OFFLINE });
  off();
  emitAppNotice({ type: NOTICE.QUOTA });
  assert.equal(got.length, 1);
  assert.equal(got[0].type, NOTICE.AUDIO_OFFLINE);
});

test("a throwing subscriber never breaks the producer or other subscribers", () => {
  const off1 = onAppNotice(() => { throw new Error("bad subscriber"); });
  let ok = false;
  const off2 = onAppNotice(() => { ok = true; });
  assert.doesNotThrow(() => emitAppNotice({ type: NOTICE.CORRUPT }));
  off1(); off2();
  assert.equal(ok, true);
});

test("OfflineStatus maps every notice type to a message", () => {
  for (const k of Object.keys(NOTICE)) {
    assert.ok(STATUS_SRC.includes(`NOTICE.${k}`), `OfflineStatus handles NOTICE.${k}`);
  }
  // Restrained: audio notice auto-dismisses; it is not a permanent banner.
  assert.match(STATUS_SRC, /AUTO_DISMISS/);
  assert.match(STATUS_SRC, /aria-live/);
});

// ── R7: audio failure surfaces a clear state (not silent) ──
test("29/30. useAudio sets an audioError on failure and clears it on successful load", () => {
  assert.match(AUDIO_SRC, /audioError/);
  assert.match(AUDIO_SRC, /signalAudioUnavailable/);
  assert.match(AUDIO_SRC, /emitAppNotice\(\s*\{\s*type:\s*NOTICE\.AUDIO_OFFLINE/);
  assert.match(AUDIO_SRC, /clearAudioError/);
  // the hook exposes the error state to views
  assert.match(AUDIO_SRC, /return\s*\{[\s\S]*audioError[\s\S]*\}/);
});

// ── R9: offline does not walk the whole queue firing a burst of fetches ──
test("31. queue-advance error handlers short-circuit when offline", () => {
  assert.match(AUDIO_SRC, /isOffline\s*=\s*\(\)\s*=>/);
  // every onerror that would advance the queue guards on isOffline() first
  const advanceHandlers = AUDIO_SRC.match(/onerror=\(\)=>\{[^}]*\}/g) || [];
  const offlineGuarded = advanceHandlers.filter((h) => h.includes("isOffline()"));
  assert.ok(offlineGuarded.length >= 2, "at least the two queue players short-circuit offline");
});

// ── R16: a hanging metadata fetch cannot spin forever ──
test("32. the audio-metadata fetch is bounded by an AbortController timeout", () => {
  assert.match(AUDIO_SRC, /AbortController/);
  assert.match(AUDIO_SRC, /abort\(\)/);
  assert.match(AUDIO_SRC, /signal:\s*ctrl\.signal/);
});

// ── R33: an audio failure can NEVER falsely mark listening/session complete ──
test("33. useAudio error/end handlers never trigger session completion", () => {
  // completion is a manual user action elsewhere; the audio hook only ever
  // touches playback state, never progress/session-completion.
  assert.doesNotMatch(AUDIO_SRC, /pushActivity|sessionsCompleted|markComplete|setSessionsCompleted|saveCompletedAyahs/);
});
