// ── QCF PAGE-BOUNDARY RECOVERY ────────────────────────────────────────────
//
// quran.com's `verses/by_page/{N}` groups verses by ITS mushaf edition. Our
// layout is KFGQPC v2 (public/verse-to-page.json). On a handful of pages the two
// disagree, and the API's response for page N omits a verse that our page N
// really does contain — while the SAME verse, fetched from the adjacent endpoint
// page, still reports `page_number: N` in both the verse and its words. The API's
// grouping disagrees with the API's own field.
//
// A full 6,236-ayah scan found 56 such ayahs: 43 recoverable from page N-1, 13
// from page N+1. Zero missing words, zero missing end glyphs, zero duplicates.
//
// ── WHY IT SHOWED UP AS AN ORNAMENT BUG ──────────────────────────────────
// The tracker already backfilled these verses — but with `words=false`, so the
// recovered verse arrived with no `words[]`, hence no `code_v2`. AyahDrawer keys
// its rendering off exactly that (`selVerse.words?.some(w => w.code_v2)`), so the
// verse fell to the `text_uthmani` path and drew a SYNTHETIC end-of-ayah ornament
// instead of the authentic QCF glyph. The text was recovered; the glyphs were not.
//
// ── WHY THE ACCEPTANCE RULES ARE STRICT, NOT PARANOID ────────────────────
// The QCF font is PAGE-SPECIFIC (`p${mushafPage}-v2`). A word's `code_v2` is a PUA
// codepoint that only means the right glyph in ITS OWN page's font. Importing a
// word whose `page_number` is the neighbouring page would render its glyphs
// through the wrong font and produce garbage — visibly wrong Arabic, which is far
// worse than the synthetic ornament we are replacing. So every word must
// independently confirm it belongs to this page, or the verse is refused and the
// safe fallback keeps it.
//
// PURE: no fetch, no DOM, no React. The page fetcher is injected, so this is
// tested without a network and cannot reach out by accident.

export const CHAR_TYPE_WORD = "word";
export const CHAR_TYPE_END = "end";

// Which endpoint pages may hold a verse our layout puts on `mushafPage`.
// BOTH directions — the scan found the misattribution going each way, and
// assuming one direction would have silently left 13 of the 56 broken.
export function neighborPagesFor(mushafPage) {
  return [mushafPage - 1, mushafPage + 1].filter((p) => p >= 1 && p <= 604);
}

// Verse keys our authoritative map says belong on this page but the primary
// response did not return.
export function missingVerseKeys(expectedKeys, verses) {
  const have = new Set((verses || []).map((v) => v.verse_key));
  return (expectedKeys || []).filter((vk) => !have.has(vk));
}

const isRenderedWord = (w) =>
  !w.char_type_name || w.char_type_name === CHAR_TYPE_WORD || w.char_type_name === CHAR_TYPE_END;

// ── STRICT ACCEPTANCE ─────────────────────────────────────────────────────
//
// A candidate from a neighbouring endpoint page is accepted ONLY if every one of
// these holds. Any doubt at all and we decline it — the synthetic fallback is
// merely ugly, whereas a wrong-font glyph is wrong Qur'an.
export function isRecoverableVerse(verse, mushafPage, missingSet) {
  if (!verse || typeof verse.verse_key !== "string") return false;

  // 1. It must be a verse we are actually missing. Never import an unrelated
  //    verse that merely happens to be in the neighbour's response.
  if (!missingSet.has(verse.verse_key)) return false;

  // 2. The verse itself must claim this page.
  if (verse.page_number !== mushafPage) return false;

  // 3. It must carry QCF words — recovering it without them is the very bug
  //    this exists to fix.
  const words = Array.isArray(verse.words) ? verse.words : null;
  if (!words || words.length === 0) return false;

  const rendered = words.filter(isRenderedWord);
  if (rendered.length === 0) return false;
  if (!rendered.every((w) => typeof w.code_v2 === "string" && w.code_v2.length > 0)) return false;

  // 4. EVERY word must claim this page. A word carrying the neighbour's
  //    page_number would be drawn with the neighbour's font — see the header.
  if (!rendered.every((w) => w.page_number === mushafPage)) return false;

  // 5. Exactly one end-of-ayah glyph. Zero means no ornament; two means a
  //    duplicated one. Both are defects we would be importing on purpose.
  const ends = rendered.filter((w) => w.char_type_name === CHAR_TYPE_END);
  if (ends.length !== 1) return false;

  return true;
}

// Insert into an ascending (surah, ayah) ordered list, preserving order.
// Returns the same array (the caller's `vs`), mutated in place — matching the
// splice-based ordering the tracker already relied on.
export function insertVerseInOrder(verses, verse) {
  const [s, a] = verse.verse_key.split(":").map(Number);
  const at = verses.findIndex((x) => {
    const [xs, xa] = x.verse_key.split(":").map(Number);
    return xs > s || (xs === s && xa > a);
  });
  if (at === -1) verses.push(verse);
  else verses.splice(at, 0, verse);
  return verses;
}

// ── THE RECOVERY ──────────────────────────────────────────────────────────
//
// `fetchPageVerses(pageNumber)` must resolve to that endpoint page's verses
// (words=true, same word_fields as the primary request) or to null/[] on any
// failure. It is injected: this module performs no I/O of its own.
//
// `shouldCancel()` is consulted after every await, so an in-flight recovery
// abandons cleanly when the user flips the page — preserving the existing
// cancellation semantics of the effect that calls this.
//
// Returns only the verses that passed every acceptance rule. Anything it cannot
// prove belongs here is left for the caller's safe fallback.
export async function recoverMissingVerses({
  mushafPage,
  missing,
  fetchPageVerses,
  shouldCancel = () => false,
}) {
  const recovered = [];
  if (!missing || missing.length === 0) return recovered;

  const outstanding = new Set(missing);

  for (const neighbor of neighborPagesFor(mushafPage)) {
    if (outstanding.size === 0) break;          // everything already recovered
    if (shouldCancel()) return [];

    let verses = null;
    try {
      verses = await fetchPageVerses(neighbor);
    } catch {
      continue;                                  // a bad neighbour is not fatal
    }
    if (shouldCancel()) return [];
    if (!Array.isArray(verses)) continue;

    for (const verse of verses) {
      if (!isRecoverableVerse(verse, mushafPage, outstanding)) continue;
      recovered.push(verse);
      outstanding.delete(verse.verse_key);       // never import the same key twice
    }
  }

  return recovered;
}
