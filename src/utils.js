// ── UTILITY FUNCTIONS — extracted from quran-hifz-tracker.jsx ──
import { SURAH_AYAH_COUNTS, JUZ_RANGES } from "./data/constants";

export function mushafImageUrl(page) {
  return `https://raw.githubusercontent.com/Jalil6438/mushaf-images/master/page-${String(page + 3).padStart(3,"0")}.png`;
}

export function audioUrl(recitationId, verseKey) {
  const [surah, ayah] = verseKey.split(":");
  const s = String(surah).padStart(3,"0");
  const a = String(ayah).padStart(3,"0");
  return `https://audio.qurancdn.com/wbw/${s}_${a}_${String(recitationId).padStart(3,"0")}.mp3`;
}

export function audioUrlFallback(verseKey, recitationId) {
  return `https://verses.quran.com/${verseKey}.mp3?recitation=${recitationId}`;
}

export function toArabicDigits(num) {
  return String(num).replace(/[0-9]/g, d => "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669"[d]);
}

export function calcTimeline(years, memorizedAyahs, months, nextJuzAyahs, completedJuzCount) {
  const totalAyahs = 6236;
  const remainingAyahs = Math.max(0, totalAyahs - memorizedAyahs);
  const totalMonths = (years * 12) + (months || 0);
  const totalDays = totalMonths * 30;
  const apd = totalDays > 0 ? Math.max(1, remainingAyahs / totalDays) : 1;
  const juzDone = completedJuzCount || 0;
  const juzLeft = Math.max(0, 30 - juzDone);
  const avgJuzSize = totalAyahs / 30;
  const juzSizeForDisplay = nextJuzAyahs || avgJuzSize;
  const daysPerJuz = apd > 0 ? Math.ceil(juzSizeForDisplay / apd) : 0;
  const juzPerMonth = totalMonths > 0 ? (juzLeft / totalMonths) : 0;
  return {
    ayahsPerDay: apd.toFixed(1), daysPerJuz,
    juzPerMonth: juzPerMonth.toFixed(1),
    revDuhr: Math.max(1, Math.round(apd * 0.3)),
    revAsr: Math.max(1, Math.round(apd * 0.2)),
    activeDays: totalDays, ayahsLeft: remainingAyahs,
    memorizedAyahs, pct: Math.round((memorizedAyahs / totalAyahs) * 100),
    juzDone, juzLeft
  };
}

// ── V9 AYAH STORAGE ──
const V9_KEY = "jalil-quran-v9";

export function loadCompletedAyahs() {
  try { const s = localStorage.getItem(V9_KEY); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
}

export function saveCompletedAyahs(set) {
  try { localStorage.setItem(V9_KEY, JSON.stringify([...set])); } catch {}
}

// ── JUZ KEY HELPERS ──
export function expandRangeToKeys(startKey, endKey) {
  const keys = [];
  let [s, a] = startKey.split(":").map(Number);
  const [es, ea] = endKey.split(":").map(Number);
  while (s < es || (s === es && a <= ea)) {
    keys.push(`${s}:${a}`);
    if (s === es && a === ea) break;
    a++;
    if (a > SURAH_AYAH_COUNTS[s]) { s++; a = 1; }
  }
  return keys;
}

const _juzKeyCache = {};
export function getJuzKeys(juzNum) {
  if (!juzNum || !JUZ_RANGES[juzNum]) return [];
  if (!_juzKeyCache[juzNum]) {
    const { start, end } = JUZ_RANGES[juzNum];
    _juzKeyCache[juzNum] = expandRangeToKeys(start, end);
  }
  return _juzKeyCache[juzNum];
}

// Session wisdom helper
export function getSessionWisdom(sessionId, SESSION_WISDOM) {
  const pool = SESSION_WISDOM[sessionId];
  if (!pool || !pool.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return pool[day % pool.length];
}
