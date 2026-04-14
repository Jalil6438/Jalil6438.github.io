// ── UTILITY FUNCTIONS — extracted from quran-hifz-tracker.jsx ──
import { SURAH_AYAH_COUNTS, JUZ_RANGES } from "./data/constants";

// Auto-crop white margins from a mushaf page image. Returns a data URL, or the
// original URL on any failure (tainted canvas / load error).
export function cropMushafImage(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      let imageData;
      try { imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); }
      catch(e) { resolve(imgUrl); return; }
      const data = imageData.data;
      let top = 0, bottom = canvas.height - 1, left = 0, right = canvas.width - 1;
      const isWhite = (r,g,b) => r > 240 && g > 240 && b > 240;
      outer: for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (!isWhite(data[i],data[i+1],data[i+2])) { top = y; break outer; }
        }
      }
      outer: for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (!isWhite(data[i],data[i+1],data[i+2])) { bottom = y; break outer; }
        }
      }
      outer: for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
          const i = (y * canvas.width + x) * 4;
          if (!isWhite(data[i],data[i+1],data[i+2])) { left = x; break outer; }
        }
      }
      outer: for (let x = canvas.width - 1; x >= 0; x--) {
        for (let y = 0; y < canvas.height; y++) {
          const i = (y * canvas.width + x) * 4;
          if (!isWhite(data[i],data[i+1],data[i+2])) { right = x; break outer; }
        }
      }
      const w = right - left;
      const h = bottom - top;
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      out.getContext("2d").drawImage(canvas, left, top, w, h, 0, 0, w, h);
      resolve(out.toDataURL());
    };
    img.onerror = () => resolve(imgUrl);
  });
}

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

