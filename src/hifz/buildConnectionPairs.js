// ── Connection phase (الربط) — pair logic for the al-Qasim hifz method ──
// Pure functions: depend only on the batch + rep state, no React/DOM.
// Extracted verbatim from MyHifzTab so the methodology has a testable home.

// Group the batch's verses by surah, preserving first-seen surah order. Each
// surah is memorized as its own unit, so connection pairs/closers never cross
// surah boundaries. Only Fajr forms connection groups; review sessions get [].
export function buildConnSurahGroups(batch, isFajr) {
  if (!isFajr || batch.length < 1) return [];
  const map = {};
  const order = [];
  batch.forEach((v) => {
    const s = Number(v.verse_key.split(":")[0]);
    if (!map[s]) {
      map[s] = [];
      order.push(s);
    }
    map[s].push(v);
  });
  return order.map((s) => ({ surahNum: s, verses: map[s] }));
}

// Build adjacent ayah-to-ayah pairs {N-1, N} within each surah group. A pair is
// `ready` once BOTH of its ayahs have reached repTarget (the Shaykh's 20×).
// Cross-surah pairs are never formed.
export function buildConnectionPairs({ connSurahGroups, isFajr, repCounts, repTarget }) {
  if (!isFajr) return [];
  const arr = [];
  connSurahGroups.forEach((g) => {
    const verses = g.verses;
    for (let i = 0; i < verses.length - 1; i++) {
      const v1 = verses[i],
        v2 = verses[i + 1];
      const a1 = v1.verse_key.split(":")[1];
      const a2 = v2.verse_key.split(":")[1];
      const bothDone =
        (repCounts[v1.verse_key] || 0) >= repTarget &&
        (repCounts[v2.verse_key] || 0) >= repTarget;
      arr.push({
        key: `pair-${v1.verse_key}-${v2.verse_key}`,
        label: `Ayah ${a1} + ${a2}`,
        ayahs: [v1, v2],
        ready: bothDone,
        surahNum: g.surahNum,
      });
    }
  });
  return arr;
}
