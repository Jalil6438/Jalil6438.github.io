// One-shot script: downloads two English translations from quran.com and
// writes them to public/translations/*.json as { "1:1": "...", "1:2": "...", ... }.
// Run with: node scripts/download-translations.js

const fs = require("fs");
const path = require("path");

const TRANSLATIONS = [
  { id: 203, slug: "muhsin-khan", label: "Hilali & Khan (Muhsin Khan)" },
  { id: 20,  slug: "sahih-international", label: "Saheeh International" },
];

const OUT_DIR = path.join(__dirname, "..", "public", "translations");

function clean(t) {
  return (t || "")
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s*,\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchSurah(translationId, chapter) {
  const url = `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${chapter}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for surah ${chapter}`);
  const data = await res.json();
  return data.translations || [];
}

async function downloadOne({ id, slug, label }) {
  console.log(`\n→ ${label} (id=${id})`);
  const out = {};
  for (let s = 1; s <= 114; s++) {
    process.stdout.write(`  surah ${s}... `);
    const verses = await fetchSurah(id, s);
    verses.forEach((v, i) => {
      out[`${s}:${i + 1}`] = clean(v.text);
    });
    process.stdout.write(`${verses.length} ayahs\n`);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`✓ wrote ${outPath} (${Object.keys(out).length} ayahs, ${kb} KB)`);
}

(async () => {
  for (const t of TRANSLATIONS) {
    await downloadOne(t);
  }
  console.log("\nDone.");
})().catch(e => {
  console.error("Failed:", e);
  process.exit(1);
});
