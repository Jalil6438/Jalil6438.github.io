// Pure validator for the BuddyAR Arabic licensing manifest.
// No filesystem access here so it is unit-testable: pass a parsed manifest in.
import { FIELD_ORDER, STATUS_VALUES, CLEARED_STATUSES } from "./manifest.mjs";

const norm = (v) => String(v ?? "").toUpperCase().replace(/\s+/g, "");

export function isNonCommercial(license) {
  return /\bNC\b|-NC-|-NC\d|-NC$/.test(norm(license).replace(/-/g, "-"));
}
export function isNoDerivatives(license) {
  return /\bND\b|-ND-|-ND\d|-ND$/.test(norm(license));
}
export function isShareAlike(license) {
  return /-SA-|-SA\d|-SA$|BYSA/.test(norm(license));
}

// Accepted families: Public Domain, CC0, CC-BY, CC-BY-SA. Never NC or ND.
export function isAcceptedLicense(license) {
  const n = norm(license);
  if (!n) return false;
  if (isNonCommercial(license) || isNoDerivatives(license)) return false;
  if (n.includes("PUBLICDOMAIN") || n === "PD") return true;
  if (n.includes("CC0")) return true;
  if (n.includes("CC-BY-SA") || n.startsWith("CCBYSA")) return true;
  if (n.includes("CC-BY") || n.startsWith("CCBY")) return true;
  return false;
}

const truthy = (v) => v === true || v === "true";
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

// verification_method must show the individual item was checked, not just the platform.
function isPlatformOnly(method) {
  const m = String(method ?? "").toLowerCase();
  const mentionsPlatform = /platform/.test(m);
  const mentionsItem = /(individual|per-item|per item|item page|asset page|story page|file page|book page|clip page)/.test(m);
  return mentionsPlatform && !mentionsItem;
}

/**
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validate(manifest) {
  const errors = [];
  const warnings = [];

  if (!manifest || !Array.isArray(manifest.assets)) {
    errors.push("Manifest has no 'assets' array.");
    return { errors, warnings };
  }

  const seen = new Map();

  for (const asset of manifest.assets) {
    const id = asset.asset_id || "(missing asset_id)";
    const tag = `[${id}]`;

    // Unknown fields (typo guard) — warning only.
    for (const key of Object.keys(asset)) {
      if (!FIELD_ORDER.includes(key)) warnings.push(`${tag} unknown field "${key}"`);
    }

    // asset_id present + unique.
    if (isBlank(asset.asset_id)) {
      errors.push(`${tag} missing asset_id`);
    } else if (seen.has(asset.asset_id)) {
      errors.push(`${tag} duplicate asset_id (also at index ${seen.get(asset.asset_id)})`);
    } else {
      seen.set(asset.asset_id, manifest.assets.indexOf(asset));
    }

    // Valid status.
    if (!STATUS_VALUES.includes(asset.status)) {
      errors.push(`${tag} invalid status "${asset.status}" (allowed: ${STATUS_VALUES.join(", ")})`);
    }

    // Provenance always required.
    if (isBlank(asset.source_url) || isBlank(asset.source_platform)) {
      const msg = `${tag} missing provenance (source_url and/or source_platform)`;
      if (CLEARED_STATUSES.includes(asset.status)) errors.push(msg);
      else warnings.push(msg);
    }

    // License semantic contradictions — checked for every non-rejected asset.
    if (asset.status !== "rejected") {
      if (isNonCommercial(asset.license) && truthy(asset.commercial_use)) {
        errors.push(`${tag} NC license "${asset.license}" marked commercial_use=true`);
      }
      if (isNoDerivatives(asset.license) && truthy(asset.remix_allowed)) {
        errors.push(`${tag} ND license "${asset.license}" marked remix_allowed=true`);
      }
      if (isShareAlike(asset.license) && !truthy(asset.share_alike)) {
        errors.push(`${tag} CC BY-SA license "${asset.license}" without share_alike=true (share-alike obligation undocumented)`);
      }
    }

    // Full clearance checks only for statuses that assert the asset is usable.
    if (CLEARED_STATUSES.includes(asset.status)) {
      const required = [
        "source_url", "license", "license_url", "commercial_use",
        "date_verified", "verified_by", "verification_method",
      ];
      for (const f of required) {
        if (isBlank(asset[f])) errors.push(`${tag} approved asset missing required field "${f}"`);
      }

      // Some creator metadata must exist.
      const hasCreator = [asset.creator, asset.author, asset.illustrator, asset.translator, asset.speaker]
        .some((v) => !isBlank(v));
      if (!hasCreator) errors.push(`${tag} approved asset missing creator metadata (creator/author/illustrator/translator/speaker)`);

      // License must be an accepted category.
      if (!isAcceptedLicense(asset.license)) {
        errors.push(`${tag} approved asset has non-accepted license "${asset.license}"`);
      }

      // Attribution text required when attribution is required.
      if (truthy(asset.attribution_required) && isBlank(asset.attribution_text)) {
        errors.push(`${tag} approved asset requires attribution but attribution_text is empty`);
      }

      // Local file OR a remote reference must exist.
      if (isBlank(asset.local_file) && isBlank(asset.source_url)) {
        errors.push(`${tag} approved asset has neither local_file nor remote source_url`);
      }

      // Content hash required once a local copy exists.
      if (!isBlank(asset.local_file) && isBlank(asset.content_hash)) {
        errors.push(`${tag} approved asset has local_file but no content_hash`);
      }

      // Cannot approve on platform-level licensing alone.
      if (isPlatformOnly(asset.verification_method)) {
        errors.push(`${tag} approved asset verified on platform-level licensing only (verification_method must reference the individual item page)`);
      }
    }

    // Rejected assets should say why.
    if (asset.status === "rejected" && isBlank(asset.notes)) {
      warnings.push(`${tag} rejected asset has no notes explaining why`);
    }

    // Gentle reminders for not-yet-cleared assets.
    if ((asset.status === "candidate" || asset.status === "needs-human-review") && truthy(asset.commercial_use) && isPlatformOnly(asset.verification_method)) {
      warnings.push(`${tag} not yet cleared and verified on platform-level only — open the individual item page before approving`);
    }
  }

  return { errors, warnings };
}
