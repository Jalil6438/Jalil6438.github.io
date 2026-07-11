# Al-Hifz — Compliance Cleanup Notes

Packet `WP-20260711-AH-PRIVACY-SECURITY-001-CLEANUP` (parent
`WP-20260711-AH-PRIVACY-SECURITY-001`). Two documented conditions from Hafsa's
audit that are intentionally **not** code-changed here, with evidence and the
recommended path.

---

## 1. SettingsPage.jsx lint — documented waiver

**Finding:** 11 `react-hooks/static-components` errors ("Cannot create
components during render") in `src/components/pages/SettingsPage.jsx`.

**Analysis — all 11 pre-existed at `59d0b3b`; zero were introduced by the
privacy packet.**

| Version | Error count | Rule | Lines |
|---|---|---|---|
| `59d0b3b` (pre-packet) | 11 | react-hooks/static-components | 56,57,62,63,68,73,74,79,80,84,89 |
| HEAD (current) | 11 | react-hooks/static-components | 72,73,78,79,84,89,90,95,96,100,105 |

Every line number shifted by **+16** — exactly the 16 lines the parent packet
added *above* the render body (the `disablePush` import + the `resetAllData`
helper). The parent packet's diff of this file (`git diff 59d0b3b..HEAD --
src/components/pages/SettingsPage.jsx`) touches only: the import, `resetAllData`,
the reset `onClick`, and the confirmation copy. It does **not** touch the inline
`Row` / `SectionLabel` definitions that trigger the rule (a grep for
`const Row` / `const SectionLabel` in that diff is empty). The errors surfaced on
the "changed-file surface" only because the file was edited for the
reset-unsubscribe fix.

**Why not fixed here (waiver rationale):** the trigger is the inline `Row` and
`SectionLabel` components. Unlike TermsPage's helpers (which close over nothing
and were safely hoisted to module scope in the parent packet), `Row` and
`SectionLabel` **close over `dark`** (and `Row` also uses `RowMedallion` and
per-row handlers). Hoisting them to module scope requires threading `dark`/`T`
through props at ~8 call sites — a refactor of a live production Settings surface
with real visual-regression risk. That is "unrelated refactoring / broad
cleanup," explicitly out of scope for this cleanup packet.

**Recommendation:** waive the 11 pre-existing errors for this packet; address
them in a dedicated, visually-verified lint-cleanup slice that hoists `Row` /
`SectionLabel` (passing `dark`/`T`/handlers as props) and re-checks the rendered
Settings page. Not a blocker for the privacy/compliance work, which changed no
render-time component structure.

---

## 2. Release-gate condition — TermsPage quarantine

**`scripts/release-check.mjs` is NOT changed in this packet.** This section only
documents the condition and the recommended narrow correction for a future
release-cutting packet.

**Current state.** `scripts/release-check.mjs` carries a blunt guard in its
`FORBIDDEN` list: `{ re: /TermsPage/, why: "TermsPage work is out of scope" }`.
It flags any release diff touching `TermsPage` as a violation. This is correct
for the routine curated web patches (v1.5.x) where TermsPage was **not** in
scope, and it remains in place.

**Why a privacy/compliance release will need a scoped change.** The honest
Privacy/Terms/Contact page (`src/components/pages/TermsPage.jsx`, corrected in the
parent packet) is now a **required** App Store compliance artifact — Apple
requires an accessible privacy policy, and Settings links to this page. A
compliance/native release must therefore *include* `TermsPage.jsx`, which the
blunt forbidden pattern would reject. So that release cannot use the default
`release:check` invocation unchanged.

**Recommended narrow correction (does not weaken protection for other forbidden
files).** No permanent edit to `release-check.mjs` is required — the tool already
provides scoped mechanisms:

1. **Per-release allow (preferred, no code change):** run
   `npm run release:check -- --release --base <prod-sha> --allow TermsPage`. The
   `--allow` flag downgrades only the `TermsPage` match to a WARNING; **every
   other forbidden pattern** (reminders, oauth, fonts, backup/export, package
   files, …) still fails hard. Protection for unrelated files is untouched.
2. **Exact-scope gate (strongest):** additionally pass `--expect` /
   `--scope-file` listing the exact release diff (including
   `src/components/pages/TermsPage.jsx`). The diff must then match exactly —
   TermsPage is explicitly accounted for, and any unrelated forbidden (or novel)
   file still fails.

**If a permanent change is ever wanted** (once the honest TermsPage is the
accepted production baseline), the narrow correction is to remove **only** the
`{ re: /TermsPage/, … }` entry from the `FORBIDDEN` array — a one-line, targeted
change that leaves all other forbidden patterns intact. That belongs to a future
release-cutting packet, not this cleanup packet.
