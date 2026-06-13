import { SURAH_EN, SURAH_AYAH_COUNTS } from "../data/constants.js";

// ── Connection phase (الربط) — surah "closer" logic for the al-Qasim method ──
// Pure. Extracted verbatim from MyHifzTab.
//
// Short surahs get one per-surah closer ("all N ayahs together × 10"). Long
// surahs follow the Shaykh's two-section structure:
//   section-1 closer → bridge pair (gates section 2) → section-2 closer → page closer.
//
// "Long" is measured in mushaf *lines*, not ayah count, matching the book. The
// split point is the midpoint of the unique lines the surah's ayahs occupy on
// the page; a verse whose first line is in the first half is section 1, else
// section 2. Falls back to an ayah-count split when line data is unavailable.
export const SECTION_SPLIT_LINE_THRESHOLD = 7;

export function buildClosers({
  connSurahGroups,
  connAllPairs,
  repCounts,
  connectionReps,
  repTarget,
}) {
  return connSurahGroups
    .filter((g) => g.verses.length >= 2)
    .flatMap((g) => {
      const verses = g.verses;
      const n = verses.length;
      const surahName = SURAH_EN[g.surahNum] || `Surah ${g.surahNum}`;
      // A closer only truly closes the surah if this group reaches the surah's
      // final ayah (a surah can span multiple pages/batches).
      const lastAyah = SURAH_AYAH_COUNTS?.[g.surahNum];
      const groupClosesSurah =
        lastAyah != null &&
        verses.some((v) => Number(String(v.verse_key).split(":")[1]) === lastAyah);
      const allAyahsDone = verses.every(
        (v) => (repCounts[v.verse_key] || 0) >= repTarget,
      );
      const surahPairs = connAllPairs.filter((p) => p.surahNum === g.surahNum);
      const surahPairsDone =
        surahPairs.length > 0 &&
        surahPairs.every((p) => (connectionReps[p.key] || 0) >= 10);

      // Compute split point.
      const surahLines = [
        ...new Set(
          verses.flatMap((v) => v._lines || []).filter((x) => typeof x === "number"),
        ),
      ].sort((a, b) => a - b);
      const totalLines = surahLines.length;
      let sec1, sec2;
      if (totalLines >= SECTION_SPLIT_LINE_THRESHOLD) {
        // Section 1 gets the first floor(totalLines/2) lines, section 2 the rest.
        const midLineIdx = Math.floor(totalLines / 2); // 1-based count of section-1 lines
        const sec1LineCutoff = surahLines[midLineIdx - 1];
        sec1 = verses.filter(
          (v) => typeof v._firstLine === "number" && v._firstLine <= sec1LineCutoff,
        );
        sec2 = verses.filter(
          (v) => typeof v._firstLine === "number" && v._firstLine > sec1LineCutoff,
        );
        // Degenerate case (one ayah straddles the boundary): ensure both non-empty.
        if (sec1.length === 0 || sec2.length === 0) {
          sec1 = null;
          sec2 = null;
        }
      }
      // Ayah-count fallback (no line data, or split produced an empty section).
      if (!sec1 || !sec2) {
        if (n < 8) {
          return [
            {
              key: `closer-${g.surahNum}`,
              label: `All ${n} ayahs of ${surahName} together`,
              ayahs: verses,
              ready: allAyahsDone && surahPairsDone,
              surahNum: g.surahNum,
              closesSurah: groupClosesSurah,
            },
          ];
        }
        const mid = Math.ceil(n / 2);
        sec1 = verses.slice(0, mid);
        sec2 = verses.slice(mid);
      }

      // Pairs grouped by section. The pair whose left verse is the last of
      // section 1 is the bridge pair that gates section 2's closer.
      const sec1Keys = new Set(sec1.map((v) => v.verse_key));
      const bridgePair = surahPairs.find(
        (p) => sec1Keys.has(p.ayahs[0].verse_key) && !sec1Keys.has(p.ayahs[1].verse_key),
      );
      const sec1Pairs = surahPairs.filter(
        (p) => sec1Keys.has(p.ayahs[0].verse_key) && sec1Keys.has(p.ayahs[1].verse_key),
      );
      const sec2Pairs = surahPairs.filter((p) => !sec1Keys.has(p.ayahs[0].verse_key));
      const sec1AyahsDone = sec1.every((v) => (repCounts[v.verse_key] || 0) >= repTarget);
      const sec2AyahsDone = sec2.every((v) => (repCounts[v.verse_key] || 0) >= repTarget);
      const sec1PairsDone =
        sec1Pairs.length === 0 ||
        sec1Pairs.every((p) => (connectionReps[p.key] || 0) >= 10);
      const sec2PairsDone =
        sec2Pairs.length === 0 ||
        sec2Pairs.every((p) => (connectionReps[p.key] || 0) >= 10);
      const bridgeDone = !bridgePair || (connectionReps[bridgePair.key] || 0) >= 10;

      return [
        {
          key: `closer-${g.surahNum}-s1`,
          label: `All ${sec1.length} ayahs of section 1 together`,
          ayahs: sec1,
          ready: sec1AyahsDone && sec1PairsDone,
          surahNum: g.surahNum,
          closesSurah: false, // first section — never the surah's end
        },
        {
          key: `closer-${g.surahNum}-s2`,
          label: `All ${sec2.length} ayahs of section 2 together`,
          ayahs: sec2,
          ready: sec2AyahsDone && sec2PairsDone && bridgeDone,
          surahNum: g.surahNum,
          closesSurah: groupClosesSurah,
        },
        {
          key: `closer-${g.surahNum}-page`,
          label: `All ${n} ayahs of ${surahName} together`,
          ayahs: verses,
          ready: allAyahsDone && surahPairsDone,
          surahNum: g.surahNum,
          closesSurah: groupClosesSurah,
        },
      ];
    });
}
