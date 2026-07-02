// Shared manifest helpers for BuddyAR Arabic licensing.
// The JSON manifest is canonical; the CSV is generated from it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(__dirname, "..", "..");
export const JSON_PATH = resolve(REPO_ROOT, "content/licenses/arabic-content-manifest.json");
export const CSV_PATH = resolve(REPO_ROOT, "content/licenses/arabic-content-manifest.csv");

// Canonical field order. The CSV columns follow this exactly.
export const FIELD_ORDER = [
  "asset_id", "title", "language", "content_type", "source_platform", "source_url",
  "creator", "author", "translator", "illustrator", "speaker", "license", "license_url",
  "commercial_use", "remix_allowed", "share_alike", "attribution_required", "attribution_text",
  "changes_made", "date_verified", "verified_by", "verification_method", "local_file",
  "content_hash", "BuddyAR_use", "status", "notes",
];

export const STATUS_VALUES = [
  "candidate", "verified", "approved-for-pilot", "rejected", "needs-human-review", "ingested",
];

// Statuses that assert an asset is cleared for use and must pass full checks.
export const CLEARED_STATUSES = ["verified", "approved-for-pilot", "ingested"];

export function loadManifest(path = JSON_PATH) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(manifest) {
  const rows = [FIELD_ORDER.join(",")];
  for (const asset of manifest.assets) {
    rows.push(FIELD_ORDER.map((f) => csvCell(asset[f])).join(","));
  }
  return rows.join("\n") + "\n";
}
