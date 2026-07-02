# BuddyAR Arabic Content Licensing System

An auditable provenance-and-licensing workflow for **legally reusable** Arabic supplemental
content in BuddyAR. It exists to stop one specific mistake: **confusing "free to access" with
"licensed for commercial reuse."**

> This is a provenance/compliance workflow, **not a legal opinion**. Where a license is
> ambiguous, mark it `needs-human-review` and do not approve it.

## What BuddyAR accepts

Only content that is clearly **one** of:

- **Public Domain**
- **CC0**
- **CC BY** (any version)
- **CC BY-SA** (any version) — *with the share-alike obligation documented (`share_alike=true`)*

## What BuddyAR rejects or quarantines

- **CC BY-NC** (NonCommercial) and any `-NC-` variant
- **CC BY-ND** (NoDerivatives) and any `-ND-` variant
- Unclear or missing licenses
- Third-party textbook scans (Bayna Yadayk, Madinah, Al-Kitaab, Gateway to Arabic,
  Mastering Arabic, and Internet Archive / Scribd / blog reposts)
- "Free to study / free to access" material with **no** open reuse license
- Content whose **platform-level** license differs from the **individual asset** license

**Never treat an entire platform as cleared when licenses vary by item.**

## Files

| File | Role |
|---|---|
| `arabic-content-manifest.json` | **Canonical** source of truth (26 fields per asset). |
| `arabic-content-manifest.csv` | Generated mirror (do not hand-edit). |
| `README.md` | This document. |
| `pilot-selection.md` | Pilot scope, scoring criteria, and rejection log. |
| `../attribution/attribution-model.md` | Attribution data model. |
| `../attribution/credits.js` / `credits.html` | Auto-rendered credits from the manifest. |
| `../../scripts/verify-licenses.mjs` | `npm run licenses:verify` |
| `../../scripts/generate-csv.mjs` | `npm run licenses:csv` |

## Manifest fields

`asset_id, title, language, content_type, source_platform, source_url, creator, author,
translator, illustrator, speaker, license, license_url, commercial_use, remix_allowed,
share_alike, attribution_required, attribution_text, changes_made, date_verified, verified_by,
verification_method, local_file, content_hash, BuddyAR_use, status, notes`

### Status values

| Status | Meaning |
|---|---|
| `candidate` | Identified, not yet verified. |
| `needs-human-review` | Ambiguous/mixed license or unread individual page — a human must decide. |
| `verified` | Individual asset page opened and license confirmed. |
| `approved-for-pilot` | Verified **and** selected for the pilot. Passes all strict checks. |
| `rejected` | Fails the license policy (reason in `notes`). |
| `ingested` | Copied into BuddyAR (has `local_file` + `content_hash`). |

Only `verified`, `approved-for-pilot`, and `ingested` assert an asset is cleared; those rows
must pass the full validator checks and are the only ones shown on the credits page.

## Per-source verification rules

- **StoryWeaver** — uniformly CC BY 4.0, but still open each story page and record
  author, illustrator, translator, and whether BuddyAR changed/translated/shortened it.
  Do not assume translations/derivatives share identical metadata.
- **Mozilla Common Voice** — CC0. Do **not** auto-mirror the full dataset. Record dataset
  **version** and **retrieval date**; prefer sampling / local research / model evaluation;
  confirm current Mozilla distribution terms (incl. the "do not re-identify speakers" clause).
- **Lingua Libre** — treat each clip as **CC BY-SA** unless the clip is explicitly CC0.
  Record speaker, word/phrase, exact license, whether audio was edited, and whether the
  derivative must remain CC BY-SA. Keep SA audio logically separate from proprietary content.
- **Storybooks Canada** — verify every item; licenses may be CC BY **or** CC BY-NC, and
  text / translation / illustration / audio can differ. Approve only commercial+remix components.
- **African Storybook** — verify every book; approve only CC BY / CC0 / acceptable CC BY-SA;
  reject NC and ND.
- **Global Digital Library** — verify each asset's actual item license; do not rely on the
  platform-wide description.
- **Wikimedia Commons / Arabic Wikisource** — record whether each asset is Public Domain,
  CC BY, or CC BY-SA; capture creator and source; preserve the public-domain rationale; do not
  assume old-looking material is automatically public domain — verify the source page.
- **OER Commons** — use only items explicitly CC0 / CC BY / acceptable CC BY-SA; reject
  NC, ND, unclear, and all-rights-reserved.

## Attribution requirements

- CC BY / CC BY-SA: show **Title · Author/Illustrator/Translator/Speaker · Source (link) ·
  License (link) · Changes made** (TASL + changes).
- CC0 / Public Domain: attribution not legally required; credit voluntarily.
- Attribution text is generated from the manifest — never hardcode it in UI components.

## Share-alike handling (CC BY-SA)

1. Set `share_alike=true` on the asset.
2. Keep the source asset under `content/pilot/` and any derivative under an SA-labelled area.
3. If BuddyAR distributes a **derivative** of an SA asset, that derivative must be released
   under CC BY-SA. Do not blend SA-derived media into proprietary content in a way that would
   place proprietary content under the SA obligation. Mere aggregation (separate files shipped
   alongside) does not trigger share-alike; creating an edited/derivative file does.

## How-to

### Add a new asset
1. Add an object to `assets` in `arabic-content-manifest.json` with a unique `asset_id`.
2. Start at `status: "candidate"`.
3. **Open the individual asset page** and record the exact `license`, `license_url`, creators,
   and `source_url`. Set `verification_method` to describe opening that item page.
4. Set `commercial_use`, `remix_allowed`, `share_alike`, `attribution_required` from the license.
5. Write `attribution_text` (or leave blank to auto-compose).
6. Move to `verified`, then `approved-for-pilot` once selected.
7. Run `npm run licenses:csv` then `npm run licenses:verify`.

### Verify an existing asset
- Re-open the source page, confirm the license is unchanged, and update `date_verified`.

### Remove an asset if licensing changes
- Set `status: "rejected"` (keep the row for the audit trail) and explain in `notes`; remove any
  `local_file`; re-run verify. Remove it from any shipped build.

### Downloaded assets
- Store under `content/pilot/{stories,audio,images,listening}/`, set `local_file`, and record a
  `content_hash` (e.g. `shasum -a 256 <file>`). The validator requires a hash once `local_file` is set.

## Date-stamped verification

`date_verified` records when the **individual** license was last confirmed. Licenses change;
re-verify periodically and on any dispute. `verified_by` + `verification_method` capture who
checked and how (which page was opened), so approvals are never based on platform-level licensing alone.

## Validation

```
npm run licenses:verify   # validate manifest + CSV sync; non-zero exit on error
npm run licenses:csv       # regenerate the CSV mirror from JSON
npm test                   # unit tests for the validator + attribution renderer
```

The verifier fails when a **cleared** asset is missing source URL, exact license, license URL,
creator metadata, commercial-use status, attribution text (when required), date verified, a
local file or remote reference, or a content hash (when downloaded). It also flags NC marked
commercial, ND marked remixable, CC BY-SA without share-alike handling, duplicate IDs, missing
provenance, and approvals based only on platform-level licensing.
