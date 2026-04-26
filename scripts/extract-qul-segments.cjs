// Extract slim per-reciter segment JSONs from QUL zip downloads.
//
// Input:  tmp-qul/surah-recitation-{slug}.zip — each contains
//           - segments.json: { "S:A": { timestamp_from, timestamp_to, ... }, ... }
//           - surah.json:    { "S": { audio_url, duration }, ... }
// Output: public/segments/{slug}.json — slim format consumed at runtime by
//         playMushafRangeQulSegments. Schema:
//           {
//             "audio_base": "https://.../{slug}//",
//             "verses":     { "S:A": [from_ms, to_ms], ... }
//           }
//
// Run: node scripts/extract-qul-segments.cjs

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const TMP = path.join(REPO, "tmp-qul");
const OUT = path.join(REPO, "public", "segments");

// Map QUL zip basename → reciter slug we use in constants.js.
const RECITERS = [
  { zip: "surah-recitation-salah-al-budair.zip",      slug: "budair"   },
  { zip: "surah-recitation-bandar-baleela.zip",       slug: "baleela"  },
  { zip: "surah-recitation-abdullah-ali-jabir.zip",   slug: "alijaber" },
  { zip: "surah-recitation-yasser-al-dosari.zip",     slug: "dosari"   },
];

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

for (const { zip, slug } of RECITERS) {
  const zipPath = path.join(TMP, zip);
  if (!fs.existsSync(zipPath)) {
    console.warn(`SKIP ${slug}: ${zip} not found`);
    continue;
  }
  const work = path.join(TMP, "extracted", slug);
  fs.mkdirSync(work, { recursive: true });
  execSync(`unzip -o "${zipPath}" -d "${work}"`, { stdio: "ignore" });

  const segments = JSON.parse(fs.readFileSync(path.join(work, "segments.json"), "utf8"));
  const surah    = JSON.parse(fs.readFileSync(path.join(work, "surah.json"), "utf8"));

  // Derive audio_base by stripping the trailing "NNN.mp3" off any surah URL.
  // QUL preserves quranicaudio's path verbatim including reciters with a
  // trailing double slash (e.g. ".../salahbudair//001.mp3") — keep as-is so
  // the URL works without server-side normalization assumptions.
  const sample = surah["1"]?.audio_url || Object.values(surah)[0]?.audio_url;
  if (!sample) { console.warn(`SKIP ${slug}: no audio_url in surah.json`); continue; }
  const audioBase = sample.replace(/\d{3}\.mp3$/, "");

  const verses = {};
  for (const [vk, v] of Object.entries(segments)) {
    if (typeof v?.timestamp_from === "number" && typeof v?.timestamp_to === "number") {
      verses[vk] = [v.timestamp_from, v.timestamp_to];
    }
  }

  const out = { audio_base: audioBase, verses };
  const outPath = path.join(OUT, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`OK ${slug}: ${Object.keys(verses).length} verses, ${kb} KB → public/segments/${slug}.json`);
}
