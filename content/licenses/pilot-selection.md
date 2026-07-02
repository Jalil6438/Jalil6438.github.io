# BuddyAR Arabic Pilot — Scope, Scoring & Rejection Log

## Pilot target (small on purpose — do NOT bulk ingest)

| Bucket | Target | Fills BuddyAR gap |
|---|---|---|
| Beginner Arabic stories | ~10 | children's foundational reading; read-along |
| Isolated word / short-phrase recordings | 50–100 | phonics, pronunciation, listening discrimination |
| Alphabet / vocabulary visuals | 10–20 | alphabet & vocabulary visual assets |
| Short listening samples | 10–20 | matched text+audio listening |

Priorities: children's foundational reading; alphabet & phonics; simple vocabulary; short
read-along stories; matched Arabic text + audio; listening discrimination; pronunciation examples.

**Avoid duplicating** the Markaz Ibn al-Qayyim and Imam Muhammad ibn Saud curricula — this pilot
is supplemental only.

## Selection scoring (score each candidate; do not approve on legality alone)

Score 1–5 on each, then decide:

1. License clarity
2. Arabic quality
3. Age suitability
4. Audio quality
5. Text quality
6. Educational value
7. Level suitability
8. Metadata completeness
9. Ease of attribution
10. Fit with BuddyAR

**Reject regardless of legality** if the content has: weak Arabic; inappropriate themes;
music-centered presentation; religiously unsuitable content; unclear age suitability; missing
attribution metadata; low-quality machine translation; or unusable audio.

## Current pilot status (seeded 2026-07-02)

The pilot was seeded in an environment that could not open individual asset pages (Wikimedia,
StoryWeaver, etc. returned HTTP 403 through the sandbox proxy). Per the core rule, **no asset is
`approved-for-pilot` yet** — clearance requires a human to open each individual page and record
the exact per-item license.

| asset_id | Source | Intended bucket | License (platform-level) | Status |
|---|---|---|---|---|
| `sw-story-ana-alyawm` | StoryWeaver | story | CC-BY-4.0 | needs-human-review |
| `sw-story-pool-arabic` | StoryWeaver | story pool | CC-BY-4.0 | candidate |
| `cv-audio-arabic-corpus` | Common Voice | audio/listening | CC0 | needs-human-review |
| `ll-audio-arabic-pool` | Lingua Libre | audio (phonics) | CC-BY-SA-4.0 | candidate |
| `commons-image-arabic-alphabet-pool` | Wikimedia Commons | image | mixed | needs-human-review |
| `sbc-listening-arabic-pool` | Storybooks Canada | listening | mixed (BY / NC) | needs-human-review |
| `gdl-listening-arabic-pool` | Global Digital Library | story | mixed | needs-human-review |
| `asb-story-arabic-pool` | African Storybook | story | mixed | needs-human-review |
| `oer-worksheet-arabic-alphabet-drill` | OER Commons | image/worksheet | per-item | needs-human-review |

## Rejection log

| asset_id | Reason |
|---|---|
| `reject-bayna-yadayk-ia-scan` | Third-party textbook scan; no open license. Privately-owned reference only. |
| `reject-madinah-free-lessons` | "Free to access" ≠ reuse license. |
| `reject-bloom-nc-example` | Bloom default is CC-BY-NC (NonCommercial) — disqualified for a commercial product. |

## Next pilot step (recommended)

1. From a machine with normal web access, open each `candidate` / `needs-human-review` asset's
   **individual page**.
2. Record the exact per-item license, creators, and `source_url`; set `verification_method` to the
   page you opened; set `date_verified`.
3. Split each `*-pool` row into individual asset rows (one per story / clip / image) until the
   bucket targets above are met.
4. Apply the selection scoring; move qualifying rows to `verified` → `approved-for-pilot`.
5. Only then download (respecting Common Voice sampling guidance), set `local_file` + `content_hash`,
   and move to `ingested`.
6. Run `npm run licenses:csv && npm run licenses:verify && npm test` before any use.
