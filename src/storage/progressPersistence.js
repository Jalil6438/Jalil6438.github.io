// ── PROGRESS PERSISTENCE GUARDS (offline reliability) ──
//
// Pure, methodology-neutral helpers that decide whether a write to the primary
// progress blob (`jalil-quran-v8`) is safe. Their whole job is to prevent the
// "silent methodology reset" cascade: when a corrupt/unreadable v8 makes the app
// boot with empty defaults, the normal auto-save must NOT then overwrite the
// stored blob with those empty defaults.
//
// These functions never touch localStorage or React — they operate on plain
// values so they are exhaustively unit-testable. They do NOT interpret or change
// any memorization rule; they only distinguish "empty progress" from "real
// progress" to protect the latter.

// A v8 blob is "empty" when it carries no real memorization state. A brand-new
// user genuinely has an empty blob (and an empty/absent stored blob), so writing
// empty-over-empty is fine; the guard only blocks empty-over-NON-empty.
export function isEmptyV8(blob) {
  if (!blob || typeof blob !== "object") return true;
  const nonEmptyObj = (o) => o && typeof o === "object" && Object.keys(o).length > 0;
  const nonEmptyArr = (a) => Array.isArray(a) && a.length > 0;

  if (nonEmptyObj(blob.juzProgress)) return false;
  if (nonEmptyObj(blob.juzStatus)) return false;
  if (Number(blob.streak) > 0) return false;
  if (nonEmptyArr(blob.sessionDone)) return false;
  if (nonEmptyArr(blob.yesterdayBatch)) return false;
  if (nonEmptyArr(blob.recentBatches)) return false;
  if (nonEmptyArr(blob.asrSelectedSurahs)) return false;
  if (nonEmptyArr(blob.asrSelectedJuz)) return false;
  if (nonEmptyArr(blob.asrReviewBatch)) return false;
  if (nonEmptyObj(blob.notes)) return false;
  if (typeof blob.streakLastCredit === "string" && blob.streakLastCredit) return false;
  // dailyChecks always carries a `date`; only non-date session keys count.
  if (blob.dailyChecks && typeof blob.dailyChecks === "object") {
    if (Object.keys(blob.dailyChecks).some((k) => k !== "date")) return false;
  }
  if (nonEmptyObj(blob.checkHistory)) return false;
  return true;
}

// Should `newBlob` be persisted over whatever is currently stored (`existingRaw`,
// the raw string from localStorage or null)?
//   • real (non-empty) progress → ALWAYS persist (normal path, incl. legitimate
//     edits and deletions once the user has actually done something);
//   • empty progress → only persist when nothing valuable would be lost, i.e.
//     the existing value is absent, empty, or itself already empty. If the
//     existing value is NON-EMPTY (real progress) or UNPARSEABLE (corrupt but
//     recoverable), refuse — this is the failed-load case we must not clobber.
export function shouldPersistV8(existingRaw, newBlob) {
  if (!isEmptyV8(newBlob)) return true;
  if (existingRaw == null || existingRaw === "") return true;
  let existing;
  try {
    existing = JSON.parse(existingRaw);
  } catch {
    return false; // existing is corrupt but recoverable → never clobber with empty
  }
  return isEmptyV8(existing); // existing also empty → harmless to write
}

// Parse a stored v8 string. Returns { ok, value, corrupt }:
//   corrupt:true — a non-null string that failed to parse (caller should salvage)
export function parseV8(raw) {
  if (raw == null) return { ok: false, value: null, corrupt: false, missing: true };
  try {
    return { ok: true, value: JSON.parse(raw), corrupt: false, missing: false };
  } catch {
    return { ok: false, value: null, corrupt: true, missing: false };
  }
}
