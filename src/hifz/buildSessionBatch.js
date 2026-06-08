// ── Session batch assembly ── pure. Extracted verbatim from MyHifzTab.

// Full mushaf page — UNION of fajrPageNum and its ±1 neighbors, since the API
// may place a verse on one page while the Madinah layout places it on another.
// Dedupe by verse_key and sort surah- then ayah-ascending. Non page-based
// sessions (e.g. Dhuhr, custom plan) pass rawBatch through unchanged.
export function buildPageBatch({ rawBatch, fajrPageVerses, fajrPageNum, isPageBasedSession }) {
  if (!isPageBasedSession || !fajrPageNum) return rawBatch;
  const all = [];
  const seen = new Set();
  for (const p of [fajrPageNum - 1, fajrPageNum, fajrPageNum + 1]) {
    (fajrPageVerses[p] || []).forEach((v) => {
      if (!seen.has(v.verse_key)) {
        seen.add(v.verse_key);
        all.push(v);
      }
    });
  }
  all.sort((a, b) => {
    const sa = parseInt(a.verse_key.split(":")[0], 10);
    const sb = parseInt(b.verse_key.split(":")[0], 10);
    if (sa !== sb) return sa - sb;
    return parseInt(a.verse_key.split(":")[1], 10) - parseInt(b.verse_key.split(":")[1], 10);
  });
  return all.length > 0 ? all : rawBatch;
}

// Cap a page-based batch to the verses the Madinah layout actually places on the
// active page (via verseToPageMap). Single-page sessions (Fajr/Maghrib/Isha) use
// this; Dhuhr spans 5 pages and non page-based sessions pass through unchanged.
export function capToMadinahPage(batchPreFilter, { verseToPageMap, fajrPageNum, isPageBasedSession }) {
  return verseToPageMap && fajrPageNum && isPageBasedSession
    ? batchPreFilter.filter((v) => verseToPageMap[v.verse_key] === fajrPageNum)
    : batchPreFilter;
}
