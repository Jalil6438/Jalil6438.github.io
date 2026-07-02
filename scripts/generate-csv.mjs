#!/usr/bin/env node
// Regenerate the CSV mirror from the canonical JSON manifest.
//   node scripts/generate-csv.mjs          # write CSV
//   node scripts/generate-csv.mjs --check  # fail if CSV is out of sync (no write)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { loadManifest, toCSV, JSON_PATH, CSV_PATH } from "./lib/manifest.mjs";

const check = process.argv.includes("--check");
const manifest = loadManifest(JSON_PATH);
const csv = toCSV(manifest);

if (check) {
  const current = existsSync(CSV_PATH) ? readFileSync(CSV_PATH, "utf8") : "";
  if (current !== csv) {
    console.error("CSV mirror is out of sync with the JSON manifest. Run: npm run licenses:csv");
    process.exit(1);
  }
  console.log("CSV mirror is in sync with the JSON manifest.");
} else {
  writeFileSync(CSV_PATH, csv);
  console.log(`Wrote ${CSV_PATH} (${manifest.assets.length} assets).`);
}
