import { SURAH_AYAH_COUNTS, JUZ_RANGES } from "../data/constants";
import { saveCompletedAyahs, getJuzKeys } from "../utils";

export default function useHifzProgress(completedAyahs, setCompletedAyahs) {

  // ── V9 ayah-based mark functions ─────────────────────────────────────────
  function v9MarkJuzComplete(juzNum) {
    const keys = getJuzKeys(juzNum);
    setCompletedAyahs(prev => {
      const next = new Set(prev);
      keys.forEach(k => next.add(k));
      saveCompletedAyahs(next);
      return next;
    });
  }

  function v9MarkJuzIncomplete(juzNum) {
    const keys = new Set(getJuzKeys(juzNum));
    setCompletedAyahs(prev => {
      const next = new Set([...prev].filter(k => !keys.has(k)));
      saveCompletedAyahs(next);
      return next;
    });
  }

  function v9MarkSurahComplete(surahNum) {
    setCompletedAyahs(prev => {
      const next = new Set(prev);
      const total = SURAH_AYAH_COUNTS[surahNum] || 0;
      for(let i=1;i<=total;i++) next.add(`${surahNum}:${i}`);
      saveCompletedAyahs(next);
      return next;
    });
  }

  function v9MarkSurahIncomplete(surahNum) {
    setCompletedAyahs(prev => {
      const total = SURAH_AYAH_COUNTS[surahNum] || 0;
      const remove = new Set();
      for(let i=1;i<=total;i++) remove.add(`${surahNum}:${i}`);
      const next = new Set([...prev].filter(k => !remove.has(k)));
      saveCompletedAyahs(next);
      return next;
    });
  }

  // V9 math helpers — O(1) or O(juz size), always ayah-based
  function v9JuzProgress(juzNum) {
    const keys = getJuzKeys(juzNum);
    const done = keys.filter(k => completedAyahs.has(k)).length;
    return { done, total: JUZ_RANGES[juzNum].total, pct: done / JUZ_RANGES[juzNum].total };
  }

  function v9IsJuzComplete(juzNum) {
    if(!juzNum || !JUZ_RANGES[juzNum]) return false;
    return getJuzKeys(juzNum).every(k => completedAyahs.has(k));
  }

  // ── Asr auto-pool helpers ─────────────────────────────────────────────────
  function isSurahComplete(surahNum) {
    const total = SURAH_AYAH_COUNTS[surahNum] || 0;
    for(let i=1;i<=total;i++) {
      if(!completedAyahs.has(`${surahNum}:${i}`)) return false;
    }
    return total > 0;
  }

  function hasAnyAyahsInJuz(juzNum) {
    return getJuzKeys(juzNum).some(k => completedAyahs.has(k));
  }

  // ── V9 MATH — single source of truth (ayah-level) ──────────────────────
  const memorizedAyahs = completedAyahs?.size ?? 0;
  const totalAyahsInQuran = 6236;
  const pct = totalAyahsInQuran>0?Math.round((memorizedAyahs / totalAyahsInQuran) * 100):0;
  // Juz count — derived from ayah truth (every ayah in the juz must be in completedAyahs)
  const completedCount = Object.keys(JUZ_RANGES).filter(j => v9IsJuzComplete(Number(j))).length;
  // Surah count — derived from ayah truth
  const completedSurahCount = Object.keys(SURAH_AYAH_COUNTS).filter(s => {
    const total=SURAH_AYAH_COUNTS[s]||0;
    if(total===0) return false;
    for(let i=1;i<=total;i++){if(!completedAyahs.has(`${s}:${i}`)) return false;}
    return true;
  }).length;

  return {
    v9MarkJuzComplete,
    v9MarkJuzIncomplete,
    v9MarkSurahComplete,
    v9MarkSurahIncomplete,
    v9JuzProgress,
    v9IsJuzComplete,
    isSurahComplete,
    hasAnyAyahsInJuz,
    memorizedAyahs,
    totalAyahsInQuran,
    pct,
    completedCount,
    completedSurahCount,
  };
}
