// ── CONNECTION-PHASE KEYS (الربط) — the single source of truth ──
//
// Every key that can appear in `rihlat-connection-reps` is BUILT here and
// VALIDATED here. The hifz helpers construct keys through these builders; the
// backup schema (src/backup/progressSchema.js) recognises keys through
// `isConnectionKey`. Neither side keeps its own copy of the format.
//
// ── WHY THIS MODULE EXISTS ────────────────────────────────────────────────
// The backup validator previously carried a hand-written approximation of these
// formats — `^(?:all|pair-\d{1,4}-\d{1,4})$` — copied from a stale code comment
// (`// "pair-0-1":count, "all":count`) rather than read off the generators. The
// real keys are `pair-2:255-2:256`, `closer-2-s1`, `all-12`. So the validator
// rejected essentially ALL real connection progress, and the client sanitizer
// then quietly dropped the whole record and reported a successful backup.
//
// A hand-written approximation of another module's output format is a bug with a
// delay fuse. There is now exactly one definition, and a test feeds the real
// builders' output through the real validator.
//
// PURE: no React, no DOM, no storage.

// A verse key as the app writes it: "surah:ayah" (e.g. "2:255").
const VERSE_KEY_RE = /^(\d{1,3}):(\d{1,3})$/;

export const MAX_SURAH = 114;
export const MAX_AYAH = 286;          // al-Baqarah, the longest surah
export const CLOSER_SECTIONS = Object.freeze(["s1", "s2", "page"]);

// Legacy index-keyed forms are bounded by the muṣḥaf, not by an arbitrary digit
// count: an ayah index cannot exceed the number of ayahs in the Qur'an.
export const MAX_AYAH_INDEX = 6236;

const inRange = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

function isVerseKey(s) {
  const m = VERSE_KEY_RE.exec(s);
  if (!m) return false;
  return inRange(Number(m[1]), 1, MAX_SURAH) && inRange(Number(m[2]), 1, MAX_AYAH);
}

// ── BUILDERS (used by the live app) ───────────────────────────────────────

// Adjacent ayah pair within a surah — buildConnectionPairs.js.
//   pairKey("2:255", "2:256") -> "pair-2:255-2:256"
export function pairKey(verseKeyA, verseKeyB) {
  return `pair-${verseKeyA}-${verseKeyB}`;
}

// Whole-surah closer for a short surah — buildClosers.js.
//   closerKey(2) -> "closer-2"
export function closerKey(surahNum) {
  return `closer-${surahNum}`;
}

// Sectioned closers for a long surah — buildClosers.js.
//   closerSectionKey(2, "s1")   -> "closer-2-s1"
//   closerSectionKey(2, "page") -> "closer-2-page"
export function closerSectionKey(surahNum, section) {
  return `closer-${surahNum}-${section}`;
}

// ── LEGACY BUILDERS ───────────────────────────────────────────────────────
//
// An older version of the connection phase keyed pairs and the "all together"
// repetition by the ayah's INDEX on the page rather than by its verse key. The
// page-completion check in MyHifzTab still reads these forms
// (MyHifzTab.jsx:452-453), and real users hold data under them — `all-12` was
// observed live. Nothing writes them any more, but they must remain readable and
// BACKUPABLE: a key we refuse is progress the user loses.
export function legacyIndexPairKey(i, j) {
  return `pair-${i}-${j}`;
}

export function legacyAllKey(index) {
  return `all-${index}`;
}

// ── THE KEY FAMILIES ──────────────────────────────────────────────────────
//
// Each family is an exact shape with bounded numbers — not a permissive
// catch-all. `parseConnectionKey` returns the family and its parsed parts, or
// null if the key belongs to no family at all.
const FAMILIES = [
  {
    name: "pair",                    // pair-2:255-2:256   (CURRENT)
    re: /^pair-(\d{1,3}:\d{1,3})-(\d{1,3}:\d{1,3})$/,
    parse: (m) => (isVerseKey(m[1]) && isVerseKey(m[2]) ? { from: m[1], to: m[2] } : null),
  },
  {
    name: "closer",                  // closer-2           (CURRENT)
    re: /^closer-(\d{1,3})$/,
    parse: (m) => (inRange(Number(m[1]), 1, MAX_SURAH) ? { surah: Number(m[1]) } : null),
  },
  {
    name: "closer-section",          // closer-2-s1|-s2|-page   (CURRENT)
    re: /^closer-(\d{1,3})-(s1|s2|page)$/,
    parse: (m) =>
      inRange(Number(m[1]), 1, MAX_SURAH) ? { surah: Number(m[1]), section: m[2] } : null,
  },
  {
    name: "legacy-index-pair",       // pair-0-1           (LEGACY)
    re: /^pair-(\d{1,4})-(\d{1,4})$/,
    parse: (m) =>
      inRange(Number(m[1]), 0, MAX_AYAH_INDEX) && inRange(Number(m[2]), 0, MAX_AYAH_INDEX)
        ? { from: Number(m[1]), to: Number(m[2]) }
        : null,
  },
  {
    name: "legacy-all",              // all-12             (LEGACY)
    re: /^all-(\d{1,4})$/,
    parse: (m) => (inRange(Number(m[1]), 0, MAX_AYAH_INDEX) ? { index: Number(m[1]) } : null),
  },
  {
    name: "legacy-all-bare",         // all                (LEGACY)
    // Documented by the app's own comment at quran-hifz-tracker.jsx:62
    // (`// "pair-0-1":count, "all":count`). No current generator produces it.
    // Kept because the risk is asymmetric: if the form never existed, accepting
    // it costs nothing (no key can match it); if it DID exist, refusing it means
    // a real user's backup now hard-fails. See docs, "residual risks".
    re: /^all$/,
    parse: () => ({}),
  },
];

export const CONNECTION_KEY_FAMILIES = Object.freeze(FAMILIES.map((f) => f.name));

// Parse a connection key -> { family, ...parts }, or null if it matches nothing.
export function parseConnectionKey(key) {
  if (typeof key !== "string" || key.length > 32) return null;
  for (const family of FAMILIES) {
    const m = family.re.exec(key);
    if (!m) continue;
    const parts = family.parse(m);
    if (parts === null) return null;      // right shape, out-of-range numbers
    return { family: family.name, ...parts };
  }
  return null;
}

// The predicate the backup schema uses as its key test.
export function isConnectionKey(key) {
  return parseConnectionKey(key) !== null;
}
