# BuddyAR Attribution Data Model

Attribution is **data-driven**, never hardcoded in UI components. Every visible credit is
derived from a single manifest asset by `content/attribution/credits.js` → `buildCredit(asset)`.
Change the manifest once and every surface updates.

## Credit object (produced by `buildCredit`)

| Field | Source manifest field(s) | Notes |
|---|---|---|
| `id` | `asset_id` | Stable key. |
| `title` | `title` | Display title. |
| `roles` | `author`, `illustrator`, `translator`, `speaker`, `creator` | Only non-empty roles are included, in that priority order. |
| `source` | `source_platform` | e.g. "StoryWeaver (Pratham Books)". |
| `sourceUrl` | `source_url` | Rendered as a link. |
| `license` | `license` | e.g. "CC-BY-4.0". |
| `licenseUrl` | `license_url` (fallback: known map) | Link to the license deed. |
| `changesMade` | `changes_made` | Defaults to "No changes". Required by CC-BY / CC-BY-SA. |
| `attributionRequired` | `attribution_required` | CC0 / Public Domain may be false. |
| `text` | `attribution_text` (fallback: composed) | Bespoke text wins; otherwise composed from structured fields. |

## Rendering rules

- Only assets whose `status` is `approved-for-pilot`, `ingested`, or `verified`
  are ever shown publicly (`CREDITABLE_STATUSES` in `credits.js`).
- A single renderer (`renderCreditsInto`) is used by any surface (settings page,
  per-asset info popover, export footer). Do not re-implement attribution strings elsewhere.

## Minimum visible credit

For CC-BY / CC-BY-SA an acceptable credit shows: **Title · Author/Illustrator/Translator/Speaker ·
Source (link) · License (link) · Changes made**. This is the "TASL" pattern
(Title, Author, Source, License) plus a changes note.

## Share-alike (CC-BY-SA)

If an asset is CC-BY-SA and BuddyAR distributes a **derivative** of it, that derivative must
itself be offered under CC-BY-SA. Keep such assets under `content/pilot/audio/` (or a clearly
labelled SA area) and never merge them into proprietary BuddyAR audio in a way that would place
proprietary content under the SA obligation. See `content/licenses/README.md` → "Share-alike handling".
