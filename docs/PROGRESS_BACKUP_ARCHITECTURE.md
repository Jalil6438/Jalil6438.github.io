# Al-Hifz — Progress Backup & Restore: Architecture

**Status:** FOUNDATION PACKET — backend only, not wired to any UI, not deployable to Production.
**Branch:** `work/al-hifz-progress-backup-foundation` (base `2be12b9`)
**Companion:** `docs/PROGRESS_BACKUP_PLAY_COMPLIANCE.md` (Play / Data safety gate)

---

## 0. One-line posture

Optional, user-initiated cloud backup of *memorization progress only*, addressed by an
anonymous capability token, with no accounts, no analytics, and no automatic restore —
built so that the worst failure mode of a sync system (silently overwriting a year of
memorization with an empty fresh install) is **structurally impossible**, not merely unlikely.

## 1. What this packet is, and what it is not

It **is** the data contract, the persistence seam, the validation and conflict rules, the
API surface, and the compliance analysis.

It is **not** shippable. Three things are deliberately missing:

1. **A durable adapter.** The only adapter is in-memory. Data lives in one serverless
   instance's heap and vanishes on cold start.
2. **Any frontend.** Nothing in the app calls these endpoints. No token is minted, no
   backup is uploaded, no restore is offered.
3. **A Production path.** `api/_backup-store.js` throws on `VERCEL_ENV=production`.

Points 1 and 3 mean this branch can be reviewed and merged with zero deploy risk: even if
it shipped to Production tomorrow, every route would answer `503 PRODUCTION_LOCKED` and no
byte of user data would move. That containment is asserted in
`tests/cloud-backup-api.test.mjs`, including a test that fails if any handler so much as
attempts a network call.

## 2. Why a backup feature is dangerous, and the two rules that make it safe

Cloud sync has one catastrophic, extremely common failure:

> User reinstalls the app → app boots with empty progress → sync "helpfully" uploads that
> emptiness → a year of memorization is overwritten by nothing.

Everything in the design below follows from refusing to let that happen. Two rules do the
work:

**Rule 1 — Emptiness is never a backup.** Empty progress is not a valid thing to *store*.
It is the *absence* of a backup, and the server refuses to record it
(`isEmptyProgress` → `409 EMPTY_PROGRESS`). A reinstalled device physically cannot
erase its own backup by syncing.

**Rule 2 — The machine may propose; only a human disposes.** There is no code path,
anywhere, that writes a remote backup onto a device without explicit confirmation. This is
enforced in the vocabulary itself: the `ACTION` enum has no `OVERWRITE_LOCAL` member. A test
asserts its absence, so adding one requires deleting a test that explains why it must not
exist.

Everything else — checksums, restore points, schema gates — is defence in depth behind these two.

## 3. Components

| File | Role |
|---|---|
| `src/backup/cloudContract.js` | **The contract.** What leaves the device, what a valid envelope is, how two backups compare. Pure: no `window`, `fetch`, `Date`, or `crypto` — timestamps passed in, hasher injected, so identical logic runs in Node, in a serverless handler, and in a browser. |
| `api/_backup-store.js` | **The persistence seam.** One adapter (in-memory). Fails closed on Production and on any adapter name but `memory`. |
| `api/_backup-lib.js` | **The server core.** Record operations, rate limits, HTTP mapping, the shared `authorize` → `sendError` route plumbing. |
| `api/backup/index.js` | `PUT` / `GET` / `DELETE` — the record lifecycle. |
| `api/backup/restore.js` | `GET ?index=N` — one full envelope, payload included. |
| `api/backup/validate.js` | `POST` — "would you accept this?", stores nothing. |
| `api/backup/export.js` | `GET` — everything the server holds (data-access route). |

The contract is imported by *both* the server and (in future) the frontend, so the two can
never drift — the same discipline `src/backup/localBackup.js` already enforces for the
local file backup.

## 4. Identity: no accounts, and no ability to build them

There are no accounts, and this packet does not introduce one.

A backup is addressed by a **capability token**: a long random base64url string the client
generates and keeps. The server stores only `sha256("alhifz-backup-v1:" + token)`. Holding
the token *is* the authorization.

Consequences, stated honestly:

- A dump of the datastore yields **no way to read any backup** — the refs are digests, and
  the payloads are addressed by them. An attacker with full storage read access still cannot
  map a record back to a token.
- The server **cannot enumerate users**, cannot email anyone, and cannot recover a lost token.
- **Lose the token, lose the backup.** This is a real product cost, and it is the price of
  having no accounts. The next packet must decide how the token is surfaced and preserved
  (§10, Decision D2).

`writerId` in the envelope is a **separate** random id minted for backup only. It is
deliberately **not** `alhifz_did`, the analytics install id. If the two were the same value,
the cloud-backup set could be joined against the usage-analytics device set and an anonymous
backup would stop being anonymous. Keeping them distinct is a one-line decision that
preserves the entire privacy story, and it is asserted by test.

## 5. The backup boundary — what leaves the device

This is the most important table in the document. The cloud boundary is a **strict subset**
of the local-file backup boundary (`localBackup.js`), because a local backup writes a file to
the user's own device while a cloud backup transmits to a server we operate — a different
privacy and legal question entirely.

### 5.1 Transmitted (13 keys)

| Key | Why it is necessary | Consequence of losing it |
|---|---|---|
| `jalil-quran-v9` | Ayah-level completion — **the source of truth** | The entire memorization record |
| `jalil-quran-v8` | Juz/session/goal/streak/Asr state blob | Session and streak state |
| `rihlat-session-log` | Per-day 5-session completion log | Streaks and charts |
| `rihlat-revised-juz` | Asr revision coverage per juz | Revision milestones |
| `jalil-asr-cycle` | Asr rotation pointer | Position in the revision cycle |
| `rihlat-journey-start` | Write-once journey baseline | All "progress since" figures |
| `rihlat-rep-counts` | Per-ayah repetition tallies | Per-ayah mastery |
| `rihlat-connection-reps` | Ayah-linking repetition tallies | Linking mastery |
| `rihlat-daily-progress` | Per-day new-ayah deltas | Dated history — **unrecoverable once the day passes** |
| `rihlat-milestone-dates` | When each milestone was reached | Dated history |
| `jalil-badge-milestones` | Earned badges | Earned achievements |
| `rihlat-rep-target` | Repetition target | **Methodology.** A rep count of 12 is "done" under one target and "half done" under another |
| `rihlat-plan-mode` | Plan regime | **Methodology.** The regime the progress was made under |

The last two are not cosmetic. They change what the progress numbers *mean*; restoring
progress without them restores misleading numbers.

### 5.2 Refused, by name (20 keys)

Every exclusion is **named** in `CLOUD_EXCLUDED_KEYS`, never merely omitted — so it is a
reviewable, tested assertion rather than an accident of list-copying.

| Group | Keys | Why refused |
|---|---|---|
| **Personal content** | `rihlat-username`, `rihlat-reflections` | The user's name and their private written reflections. Transmitting these would turn a progress backup into **user-content hosting** and would move the Play declaration into *Personal info* + *User-generated content*. Not needed to restore a single ayah. |
| **Derived display feed** | `jalil-recent-activity` | A 7-item `{type,text,ts}` widget feed of app-generated strings, rebuilt as the user works. Not memorization. |
| **Cosmetic preferences** | `rihlat-fontsize`, `rihlat-default-reading-mode`, `rihlat-translation-source`, `rihlat-tafsir-view`, `rihlat-tajweed`, `rihlat-gallery-view`, `jalil-wisdom-offset`, `jalil-quran-lastpage` | Nothing about them is progress; several are meaningless or wrong on a different device. |
| **Per-device UI state** | `rihlat-onboarded`, `rihlat-guided-session-completed`, `rihlat-mushaf-bookmarks` | Device-local state. |
| **Reminders** | `rihlat-reminders`, `jalil-hifz-reminder` | Already stored server-side against the push endpoint and bound to a device's subscription. Re-sending them would duplicate the data and add a **second linkage** for no restore benefit. |
| **Identity / analytics / ephemeral** | `alhifz_did`, `alhifz_counted`, `rihlat-push-enabled`, `rihlat-reminders-fired` | Must never leave via this path. `alhifz_did` in particular is the join key that would de-anonymize the whole scheme (§4). |

### 5.3 The tripwires

The only thing standing between "we transmit progress" and "we transmit the user's written
reflections" is a hand-maintained list — and hand-maintained lists rot. Three invariants,
all asserted in `tests/cloud-backup-contract.test.mjs`:

1. **Subset** — every cloud key is a key the local backup already knows about.
2. **Completeness** — every key the local backup knows about is *consciously classified*:
   transmitted, or explicitly refused. **Silence is not a decision.**
3. **Disjointness** — no key is both transmitted and refused.

Invariant 2 is not hypothetical. `jalil-recent-activity` was in **neither** cloud list when
this contract was first drafted — silently omitted rather than deliberately excluded, which
is precisely the failure the "name every exclusion" rule was supposed to prevent. The
original one-directional check did not catch it. The completeness tripwire does, and it will
catch the next one at the moment a key is added to `localBackup.js` and forgotten here.

An excluded or unknown key that arrives in a payload is **rejected** (`400`), not quietly
dropped. Dropping it would be the friendly thing to do and the wrong thing to do: a client
sending reflections is broken or hostile, and we want that to be loud.

## 6. The envelope (schema v1)

```jsonc
{
  "app": "rihlat-al-hifz",
  "kind": "cloud-backup",
  "schemaVersion": 1,
  "backupId":  "…",          // this backup lineage
  "writerId":  "…",          // random, backup-only; NOT alhifz_did
  "appVersion": "1.6.0",
  "platform":  "web|ios|android",
  "createdAt": "ISO-8601",   // CLIENT clock — birth of the lineage
  "updatedAt": "ISO-8601",   // CLIENT clock — used ONLY for conflict resolution
  "encryption": { "alg": "none" },
  "payload":   { "<key>": "<raw localStorage string>" },
  "checksum":  "sha256:<hex>"
}
```

**The payload is a flat map of string → string** — raw `localStorage` values, never
reinterpreted, matching `localBackup.js`'s "never reinterpret progress" rule. Flatness makes
canonicalization trivially correct: sort keys, stringify. No nested key-ordering ambiguity
can exist, so the checksum is stable across platforms.

**`encryption: {alg:"none"}`** is a forward-compatibility hook. The shape is fixed *now* so
adopting client-side end-to-end encryption later is a payload change, not a breaking envelope
change. Today the server can read payloads (§8).

**Client vs server timestamps are never conflated.** The envelope's `createdAt`/`updatedAt`
are the *client's* and are untrusted input, used only for conflict resolution and display.
The record's own `createdAt`/`updatedAt` are the *server's* and drive retention. Letting a
client clock drive retention would let a caller pin data forever or expire someone else's
early. A client timestamp more than 24h in the future is rejected outright.

**Schema gate.** Servers reject anything outside `[MIN, CURRENT]` **before interpreting any
other field**. Too old = we no longer understand it. Too new = the writer knows something we
don't, and guessing at a newer shape is exactly how progress gets silently mangled.

**Limits.** 512 KiB per payload, 256 KiB per value. A full 6,236-ayah completion set plus rep
counts lands well under 400 KiB. Size is measured in **bytes, not UTF-16 units** — Arabic is
multi-byte, and `.length` would under-count and let an oversized payload through. Tested.

## 7. The record, restore points, and idempotency

```
{ recordVersion, current, restorePoints[], revision, createdAt, updatedAt }
```

`current` and every restore point are **complete, self-describing envelopes**, so any restore
point can be handed back (or downloaded as a file) with no server-side reassembly.

**Idempotency is by content, not by a client-supplied request id.** If the incoming checksum
equals the stored one, the write is a no-op: no revision bump, no new restore point. A client
retrying a dropped response — the common case — therefore cannot burn a restore-point slot
and push a genuinely older backup out of the window.

**Preservation.** On a real change, the outgoing `current` is pushed onto the restore-point
stack before the new one takes its place. **The previous valid backup always survives exactly
one write.** Three points are kept behind `current` (bounding storage at 4 envelopes/user),
which covers the realistic failure: *"yesterday's sync ate my progress, give me the one before."*

**Retention is "untouched", not "unchanged".** Any successful write — including a no-op
re-put — refreshes the clock. A user who keeps syncing a finished muṣḥaf must not have their
backup expire because the bytes stopped changing.

## 8. Threat model

| Threat | Mitigation | Residual |
|---|---|---|
| **Datastore dump** | Refs are `sha256(domain:token)`. No record can be mapped back to a token or a person. | **Payloads are readable by anyone with storage access** (`alg:"none"`). An attacker sees an anonymous progress blob with no name, email, or device id attached. Mitigated properly only by E2E encryption — see D3. |
| **Token guessing** | ≥32 chars base64url. The read path is rate-limited (an unlimited read endpoint is an offline-guessing oracle), and **the unauthenticated 401 path is metered too** — it is the route an attacker actually uses. | Rate limits are per-IP; a distributed guesser is slowed, not stopped. The keyspace makes it hopeless regardless. |
| **Storage-exhaustion flood** | Per-ref write limit + per-IP limit, both **fail closed**. Payload caps. Empty payloads refused. | Shared NAT (carrier/office) shares an IP bucket. Tunable; documented. |
| **Malicious client parks arbitrary data** | Unknown keys rejected; excluded keys rejected; payload capped; only string values. The server is not a general-purpose bucket. | — |
| **Corrupted backup overwrites a good device** | Checksum + core-JSON parse on the way in **and re-validated on the way out** of `/restore` — integrity is checked at the last possible moment before the data could do damage. | — |
| **Empty progress destroys a real backup** | `EMPTY_PROGRESS` refusal (Rule 1). Tested end-to-end with a *newer-timestamped* fresh install, the exact shape of the real bug. | — |
| **Silent auto-restore destroys local progress** | No auto-restore exists (Rule 2). No `OVERWRITE_LOCAL` action exists. | — |
| **Backup joined to analytics identity** | `writerId` ≠ `alhifz_did`. `alhifz_did` is an excluded key and rejected if sent. | — |
| **Accidental Production write** | In-memory adapter performs **no network I/O and holds no credentials** — structurally incapable of reaching Production Redis. Plus `assertStoreAllowed()` fails closed on `VERCEL_ENV=production`. Both tested; a test also fails on *any* attempted network call. | — |

**The honest headline:** today the server can read your progress payload. It cannot tell whose
it is. Whether that is acceptable is Decision D3.

## 9. Conflict resolution (Phase 4)

`compareBackups(local, remote)` is pure, synchronous, and side-effect-free. It decides what
**may** happen — never what does. A future UI presents the result; only a human confirms.

| State | When | Proposed action | Why this is the safest resolution |
|---|---|---|---|
| `NO_REMOTE` | No usable backup on the server | `UPLOAD` | Nothing to lose. Safe without asking. |
| `NO_LOCAL` | Device has no progress; server does | `RESTORE_SAFE` | Restoring cannot lose anything — but it **still asks**. A user who reinstalled *to start over* is entitled to start over. |
| `IN_SYNC` | Checksums match | `NONE` | — |
| `LOCAL_NEWER` | Device ahead of backup | `UPLOAD` | Safe without asking: we only ever *add* to the server. |
| `REMOTE_NEWER` | Backup ahead of device | `OFFER_RESTORE` | **Ask.** Restoring replaces real local progress. Never auto-applied. |
| `DIVERGED` | Contents differ, clocks agree (within 2 min skew) | `ASK_USER` | **The dangerous one.** There is no basis to pick a winner, and picking wrong deletes memorization. It must reach a person. |
| `INCOMPATIBLE_SCHEMA` | Remote written by a newer app | `BLOCK_UPDATE_APP` | An older app cannot safely read a newer shape. Refuse and tell the user to update. |

**Clock skew is treated as noise, not evidence.** A 30-second difference between two devices
proves nothing; treating it as proof is how a stale device wins and eats a good backup.
Differences within 2 minutes collapse to `DIVERGED` → ask.

## 10. Retention & deletion policy (proposal)

| Item | Value | Justification |
|---|---|---|
| **Retention** | **400 days** from last touch | Long enough to survive a lost phone plus a slow replacement (and a full year of seasonal use); short enough that abandoned data does not accumulate forever. Play mandates **no** maximum retention period — it requires only that we *state* one (`docs/PROGRESS_BACKUP_PLAY_COMPLIANCE.md` §7). |
| **Not 90 days** | — | Play offers a deletion badge for auto-deleting within 90 days. For a *backup* feature this is actively user-hostile: it would silently destroy the thing the user asked us to keep. **Deliberately not adopted.** |
| **Restore points** | 3 behind `current` | Bounds storage at 4 envelopes/user while covering "yesterday's sync ate my progress". |
| **User deletion** | `DELETE /api/backup` — erases `current` **and every restore point**, immediately | Idempotent: deleting an already-deleted backup is a success. A user asking us to erase their data is never told "no". |
| **User access** | `GET /api/backup/export` — every byte held, plus the expiry date | An honest answer to "what do you have on me" includes when it goes away. |

Everything else keyed to a caller is a rate-limit counter (a request tally against a hashed
ref / hashed IP bucket, expiring within the hour). It holds no backup content and is not user
data in any useful sense. Stated here so the claim can be checked rather than trusted.

## 11. Open decisions (need Jalil)

- **D1 — Is memorization progress a "religious belief"?** Play's Data safety taxonomy has a
  *Personal info → Political or religious beliefs* type, defined only as *"Information about a
  user's political or religious beliefs."* A record of Qur'an memorization is at minimum
  suggestive of religious practice. If it counts, this is a **special category** under GDPR
  Art. 9 and the bar rises sharply (explicit consent, possibly E2E encryption). **This is a
  legal/product judgment and must not be made by an engineer or an AI.** See the compliance doc.
- **D2 — Token custody.** No accounts means: lose the token, lose the backup. How is it
  surfaced (recovery phrase? QR? file?) and how do we stop users from silently losing it?
- **D3 — End-to-end encryption.** The envelope is already shaped for it (`encryption.alg`).
  Adopting it makes the server blind and largely moots D1's storage risk — at the cost of
  making D2 unforgiving (no token = no recovery, ever, by anyone).
- **D4 — Durable adapter.** Which store, in which region, under which subprocessor, and
  namespaced how. Note the existing Redis env-namespacing incident: `alhifz:*` keys must be
  namespaced per environment *and migrated deliberately*.

## 12. Next packet (recommended)

1. **Decide D1 and D3 first.** They change the data model; everything else is cheaper after.
2. **Durable adapter** behind the existing seam (`api/_backup-store.js` swaps out; no handler
   changes). Env-namespaced. Retention enforced by the store's own TTL.
3. **Frontend, in this order:** mint + persist token → *manual* "Back up now" → status/restore-point
   list → restore flow gated on `compareBackups` + explicit confirmation → **local rollback
   snapshot written before any restore** → "Delete my cloud backup".
4. **Consent screen** before the first upload (opt-in, off by default — this is what keeps the
   Play "prominent disclosure & consent" ritual out of scope).
5. **Update `docs/PRIVACY.md` and `src/components/pages/TermsPage.jsx`.** Both currently state
   that *all* memorization data is device-local. **Shipping this feature makes that statement
   false**, and an inaccurate privacy disclosure is a Play enforcement matter — not a
   documentation chore. This is a hard shipping dependency.
