// ── ASR ROTATION (H4 fix) ──
// The Asr auto-pool used to pick the juz by `(asrCycle * juzCount) % len` and
// the half-of-juz by `asrCycle % numChunks`. Both were keyed to the same
// counter, so whenever the eligible-juz count was EVEN the parities locked and
// one half of every juz was never revised (27a, 28b, 29a, 30b, 27a, …).
//
// Fix: the half/chunk index now advances by the number of completed PASSES
// through the eligible list, so each full rotation of the juz flips to the
// next chunk. Coverage is complete for any list length. The amount reviewed
// per day (the stage table) is unchanged — this only fixes which slice shows.

// Which juz are reviewed this cycle (unchanged from the original logic,
// extracted for testability).
export function selectAsrJuzPool(asrCycle, juzCount, sortedEligible) {
  const len = sortedEligible?.length || 0;
  if (len === 0) return [];
  const count = Math.max(1, juzCount | 0);
  const startIdx = ((asrCycle * count) % len + len) % len;
  const pool = [];
  for (let i = 0; i < count && i < len; i++) {
    pool.push(sortedEligible[(startIdx + i) % len]);
  }
  return pool;
}

// Which chunk (half-juz slice) of this cycle's pool to show.
export function selectAsrChunkIndex(asrCycle, juzCount, eligibleLen, numChunks) {
  if (!numChunks || numChunks <= 0) return 0;
  const len = Math.max(1, eligibleLen | 0);
  const count = Math.max(1, juzCount | 0);
  const passNum = Math.floor((Math.max(0, asrCycle) * count) / len);
  return ((passNum % numChunks) + numChunks) % numChunks;
}
