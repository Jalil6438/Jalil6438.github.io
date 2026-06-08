// ── Mushaf-page → today's batch filter ── pure. Extracted verbatim from MyHifzTab.
//
// Reduce a full mushaf page's verses to what belongs in today's memorization
// batch: keep only the ACTIVE surah's ayahs that are still queued and not
// already completed (completed ayahs of non-active surahs are dropped). Then
// sort active-surah-first, remaining surahs hifz-descending (114 → 1), ayah
// ascending within each surah.
//
// Inputs:
//   activeSurahNum  — the surah currently being memorized
//   queuedSurahs    — Set of surah numbers still in the user's queue (empty = allow all)
//   completedAyahs  — Set-like with .has(verse_key) for already-memorized ayahs
export function filterActivePlusFresh(pageVs, { activeSurahNum, queuedSurahs, completedAyahs }) {
  if (!pageVs || !pageVs.length) return pageVs || [];
  const startsHere = new Set();
  pageVs.forEach((v) => {
    const [s, a] = (v.verse_key || "").split(":");
    if (a === "1") startsHere.add(Number(s) || v.surah_number);
  });
  // Active-surah only: drop tails of earlier/later surahs and fresh starts of
  // the next surah. Only the ayahs of the surah currently being memorized appear
  // in both Study and Mushaf views.
  const kept = pageVs.filter((v) => {
    const s = v.surah_number || parseInt(v.verse_key?.split(":")?.[0] || "0", 10);
    const isActive = activeSurahNum && s === activeSurahNum;
    const isFresh = false; // strict mode: only active surah
    const isQueued = queuedSurahs.size === 0 || queuedSurahs.has(s);
    const alreadyDone = completedAyahs && completedAyahs.has && completedAyahs.has(v.verse_key);
    if (alreadyDone && !isActive) return false;
    return (isActive || isFresh) && isQueued;
  });
  // Sort: active surah first, then remaining fresh surahs hifz-descending, ayah
  // ascending within each surah.
  return kept.slice().sort((a, b) => {
    const sa = a.surah_number || parseInt(a.verse_key?.split(":")?.[0] || "0", 10);
    const sb = b.surah_number || parseInt(b.verse_key?.split(":")?.[0] || "0", 10);
    if (sa !== sb) {
      if (sa === activeSurahNum) return -1;
      if (sb === activeSurahNum) return 1;
      return sb - sa;
    }
    const aa = parseInt(a.verse_key?.split(":")?.[1] || "0", 10);
    const ab = parseInt(b.verse_key?.split(":")?.[1] || "0", 10);
    return aa - ab;
  });
}
