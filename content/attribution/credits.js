// BuddyAR attribution renderer.
// Renders credits automatically from the licensing manifest. Attribution text is
// NEVER hardcoded in UI components — it always derives from the manifest so a single
// edit propagates everywhere.
//
// Usage (browser):
//   import { buildCredit, renderCreditsInto } from "./credits.js";
//   renderCreditsInto(document.getElementById("credits"), manifest);
//
// Usage (Node/build):
//   import { buildCredit } from "./credits.js";
//   const credit = buildCredit(asset);

// Only these statuses may ever surface in the user-facing credits list.
export const CREDITABLE_STATUSES = ["approved-for-pilot", "ingested", "verified"];

const LICENSE_URLS = {
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "Public Domain": "",
};

function blank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

/**
 * Build a structured credit object from a manifest asset.
 * Falls back to structured fields if no explicit attribution_text is provided,
 * so credits render even before an author writes bespoke text.
 */
export function buildCredit(asset) {
  const roles = [
    ["Author", asset.author],
    ["Illustrator", asset.illustrator],
    ["Translator", asset.translator],
    ["Speaker", asset.speaker],
    ["Creator", asset.creator],
  ].filter(([, v]) => !blank(v));

  const licenseUrl = !blank(asset.license_url)
    ? asset.license_url
    : (LICENSE_URLS[asset.license] || "");

  const text = !blank(asset.attribution_text)
    ? asset.attribution_text
    : composeText(asset, roles);

  return {
    id: asset.asset_id,
    title: asset.title,
    roles,
    source: asset.source_platform,
    sourceUrl: asset.source_url,
    license: asset.license,
    licenseUrl,
    changesMade: blank(asset.changes_made) ? "No changes" : asset.changes_made,
    attributionRequired: asset.attribution_required === true || asset.attribution_required === "true",
    text,
  };
}

function composeText(asset, roles) {
  const who = roles.map(([role, name]) => `${role}: ${name}`).join(", ");
  const parts = [`"${asset.title}"`];
  if (who) parts.push(who);
  if (!blank(asset.source_platform)) parts.push(`Source: ${asset.source_platform}`);
  if (!blank(asset.license)) parts.push(`License: ${asset.license}`);
  if (!blank(asset.changes_made)) parts.push(`Changes: ${asset.changes_made}`);
  return parts.join(" · ");
}

/** Return credits only for assets cleared to appear publicly. */
export function creditableAssets(manifest) {
  return (manifest.assets || [])
    .filter((a) => CREDITABLE_STATUSES.includes(a.status))
    .map(buildCredit);
}

// ---- Optional DOM renderer (browser only) --------------------------------
export function renderCreditsInto(container, manifest) {
  if (!container) return;
  const credits = creditableAssets(manifest);
  container.textContent = "";

  if (credits.length === 0) {
    const p = document.createElement("p");
    p.className = "credit-empty";
    p.textContent = "No third-party licensed content is currently in use.";
    container.appendChild(p);
    return;
  }

  const list = document.createElement("ul");
  list.className = "credits-list";
  for (const c of credits) {
    const li = document.createElement("li");
    li.className = "credit";

    const title = document.createElement("span");
    title.className = "credit-title";
    title.textContent = c.title;
    li.appendChild(title);

    for (const [role, name] of c.roles) {
      const span = document.createElement("span");
      span.className = "credit-role";
      span.textContent = ` ${role}: ${name}`;
      li.appendChild(span);
    }

    if (c.sourceUrl) {
      const src = document.createElement("a");
      src.className = "credit-source";
      src.href = c.sourceUrl;
      src.rel = "noopener";
      src.target = "_blank";
      src.textContent = ` Source: ${c.source}`;
      li.appendChild(src);
    }

    if (c.license) {
      const lic = document.createElement(c.licenseUrl ? "a" : "span");
      lic.className = "credit-license";
      if (c.licenseUrl) {
        lic.href = c.licenseUrl;
        lic.rel = "license noopener";
        lic.target = "_blank";
      }
      lic.textContent = ` License: ${c.license}`;
      li.appendChild(lic);
    }

    const changes = document.createElement("span");
    changes.className = "credit-changes";
    changes.textContent = ` (${c.changesMade})`;
    li.appendChild(changes);

    list.appendChild(li);
  }
  container.appendChild(list);
}
