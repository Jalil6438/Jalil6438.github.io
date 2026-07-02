#!/usr/bin/env node
// BuddyAR Arabic licensing verifier.
//   npm run licenses:verify
// Exits non-zero if the manifest has any errors, or if the CSV mirror is stale.
import { existsSync, readFileSync } from "node:fs";
import { loadManifest, toCSV, JSON_PATH, CSV_PATH, CLEARED_STATUSES } from "./lib/manifest.mjs";
import { validate } from "./lib/validate.mjs";

let manifest;
try {
  manifest = loadManifest(JSON_PATH);
} catch (err) {
  console.error(`Could not read manifest at ${JSON_PATH}: ${err.message}`);
  process.exit(1);
}

const { errors, warnings } = validate(manifest);

// CSV-sync check (treated as an error so the two files never drift).
if (!existsSync(CSV_PATH)) {
  errors.push(`CSV mirror missing at ${CSV_PATH} — run: npm run licenses:csv`);
} else if (readFileSync(CSV_PATH, "utf8") !== toCSV(manifest)) {
  errors.push("CSV mirror is out of sync with the JSON manifest — run: npm run licenses:csv");
}

// Summary by status.
const byStatus = {};
for (const a of manifest.assets) byStatus[a.status] = (byStatus[a.status] || 0) + 1;

console.log("BuddyAR Arabic licensing — verification report");
console.log("-".repeat(50));
console.log(`Assets: ${manifest.assets.length}`);
console.log("By status: " + Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(", "));
const cleared = manifest.assets.filter((a) => CLEARED_STATUSES.includes(a.status)).length;
console.log(`Cleared for use (verified/approved-for-pilot/ingested): ${cleared}`);
console.log("");

if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log("  ! " + w);
  console.log("");
}

if (errors.length) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log("  x " + e);
  console.log("");
  console.log("RESULT: FAIL");
  process.exit(1);
}

console.log("RESULT: PASS (no blocking errors)");
