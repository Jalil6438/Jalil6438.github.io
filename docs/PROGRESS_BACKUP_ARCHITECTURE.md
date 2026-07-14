# Al-Hifz — Progress Backup & Restore: Architecture

**Status:** FOUNDATION PACKET — backend only, not wired to any UI, not deployable to Production.
**Branch:** `work/al-hifz-progress-backup-foundation` (base `2be12b9`)
**Revision:** post-Hafsa re-audit (WP-20260714-AH-BACKUP-FOUNDATION-001).
**Companion:** `docs/PROGRESS_BACKUP_PLAY_COMPLIANCE.md` (Play / Data safety gate)

## Deployment state (verified)

| | |
|---|---|
| **Production version** | **v1.6.0** |
| **Production commit** | **`2be12b9a4d1eea82faa10fe276eeb7f5558dddb8`** |
| **Production branch** | **`work/al-hifz-v1.6.0-backend-reminders`** |
| **This work** | `550525e` → `e4eb491` → this revision — **LOCAL ONLY** |
| **Deployed?** | **No.** Never pushed, never merged, never previewed, never deployed. |

**Production remains on the base commit `2be12b9`. The backup foundation is not in it, and
not in any deployed artifact.** Every commit on this branch exists only in the local worktree
`C:\Users\Mark\Code\al-hifz-progress-backup`.

> An earlier revision of this document stated Production was on v1.5.3 @ `210ebee`. That was
> stale. Corrected above.

---

## 0. One-line posture

Optional, user-initiated cloud backup of *memorization progress only*, addressed by an
anonymous capability token, with no accounts, no analytics, no notes, no preferences, and no
automatic restore — built so that the worst failure mode of a sync system (silently
overwriting a year of memorization) is **structurally impossible**, not merely unlikely.

## 1. What this packet is, and what it is not

It **is** the data contract, the persistence seam, the validation/conflict/concurrency rules,
the API surface, and the compliance analysis.

It is **not** shippable. Three things are deliberately missing:

1. **A durable adapter.** The only adapter is in-memory. Data lives in one serverless
   instance's heap and vanishes on cold start.
2. **Any frontend.** Nothing in the app calls these endpoints.
3. **A Production path.** `api/_backup-store.js` throws on `VERCEL_ENV=production`.

Points 1 and 3 mean this branch can be reviewed and merged with zero deploy risk: even if it
shipped to Production tomorrow, every route would answer `503 PRODUCTION_LOCKED` and no byte
of user data would move. Asserted in `tests/cloud-backup-api.test.mjs`, including a test that
fails if any handler so much as *attempts* a network call.

## 2. Why a backup feature is dangerous, and the two rules that make it safe

Cloud sync has one catastrophic, extremely common failure:

> User reinstalls the app → app boots with empty progress → sync "helpfully" uploads that
> emptiness → a year of memorization is overwritten by nothing.

**Rule 1 — Emptiness is never a backup.** Empty progress is not a valid thing to *store*. It
is the *absence* of one, and the server refuses to record it (`409 EMPTY_PROGRESS`). A
reinstalled device physically cannot erase its own backup by syncing.

**Rule 2 — The machine may propose; only a human disposes.** No code path writes a remote
backup onto a device without explicit confirmation. Enforced in the vocabulary itself: the
`ACTION` enum has no `OVERWRITE_LOCAL` member, and a test asserts its absence — so adding one
requires deleting a test that explains why it must not exist.

Everything else is defence in depth behind these two.

## 3. Components

| File | Role |
|---|---|
| `src/backup/progressSchema.js` | **The shared source of truth.** Which fields the app persists, how it serializes them, and what every backed-up value is allowed to *contain*. **Imported by `quran-hifz-tracker.jsx` itself** — see §5.5. |
| `src/backup/cloudContract.js` | **The contract.** What leaves the device, what a valid envelope is, how two backups compare. Pure: hasher and clock injected. |
| `api/_backup-store.js` | **The persistence seam.** In-memory adapter only. Fails closed on Production. Compare-and-set is the *only* write path. |
| `api/_backup-lib.js` | **The server core.** Record ops, rate limits, IP pseudonymization, HTTP mapping, shared `authorize` → `sendError` plumbing. |
| `api/backup/index.js` | `PUT` / `GET` / `DELETE` — the record lifecycle. |
| `api/backup/restore.js` | `GET ?index=N` — one full envelope, payload included. |
| `api/backup/validate.js` | `POST` — "would you accept this?", stores nothing. |
| `api/backup/export.js` | `GET` — everything the server holds (data-access route). |

## 4. Identity: no accounts, and no ability to build them

A backup is addressed by a **capability token**: a long random base64url string the client
generates and keeps. The server stores only `sha256("alhifz-backup-v1:" + token)`. Holding the
token *is* the authorization.

- A datastore dump yields **no way to read any backup** — the refs are digests.
- The server **cannot enumerate users** and cannot recover a lost token.
- **Lose the token, lose the backup.** A real product cost, and the price of having no
  accounts. See Decision D2.

`writerId` is a **separate** random id minted for backup only — deliberately **not**
`alhifz_did`, the analytics install id. If they were the same value, the cloud-backup set
could be joined against the usage-analytics device set and an anonymous backup would stop
being anonymous. Asserted by test.

## 5. The backup boundary — what leaves the device

**Two levels of allowlist.** Key-level alone is not sufficient, and assuming it was is what
caused the most serious defect in the first revision of this packet (§5.2).

### 5.1 Transmitted keys (13)

| Key | Why it is necessary | Consequence of losing it |
|---|---|---|
| `jalil-quran-v9` | Ayah-level completion — **the source of truth** | The entire memorization record |
| `jalil-quran-v8` | Juz/session/streak/Asr state — **SANITIZED, see §5.2** | Session, streak, and juz state |
| `rihlat-session-log` | Per-day 5-session completion log | Streaks and charts |
| `rihlat-revised-juz` | Asr revision coverage per juz | Revision milestones |
| `jalil-asr-cycle` | Asr rotation pointer | Position in the revision cycle |
| `rihlat-journey-start` | Write-once journey baseline | All "progress since" figures |
| `rihlat-rep-counts` | Per-ayah repetition tallies | Per-ayah mastery |
| `rihlat-connection-reps` | Ayah-linking repetition tallies | Linking mastery |
| `rihlat-daily-progress` | Per-day new-ayah deltas | Dated history — **unrecoverable once the day passes** |
| `rihlat-milestone-dates` | When each milestone was reached | Dated history |
| `jalil-badge-milestones` | Earned badges | Earned achievements |
| `rihlat-rep-target` | Repetition target | **Methodology** — a rep count of 12 is "done" under one target, "half done" under another |
| `rihlat-plan-mode` | Plan regime | **Methodology** — the regime the progress was made under |

### 5.2 A boundary INSIDE a key: the `jalil-quran-v8` blob

`jalil-quran-v8` is **one localStorage key holding 21 fields**
(`src/quran-hifz-tracker.jsx:682`). Key-level allowlisting said "yes" to the whole blob — and
the blob contains the user's **private per-juz notes**, along with their dark-mode, reciter,
and translation-visibility preferences.

**The first revision of this packet backed all four up verbatim.** The key was on the
progress list, so it went; nobody looked inside it. That is the entire failure, and it is why
the v8 value now gets its own **field-level allowlist**, enforced in three places: the client
sanitizer, the server validator, and a tripwire test.

**Retained — 14 fields.** Each has a *value schema* (§5.4), not merely an allowed name:

| Field | Schema | Why necessary |
|---|---|---|
| `juzStatus` | map(juz\|`sNN` → `"complete"`), ≤144 keys | Juz/surah completion; the source the v9 ayah backfill reads |
| `juzProgress` | map(juz 1–30 → int 0–2000), ≤30 | Verses done per juz |
| `sessionsCompleted` | obj(fajr…isha → bool) | Which of today's five sessions are done |
| `streak` | int 0–100000 | Consecutive-day counter |
| `dailyChecks` | obj(date, fajr…isha → bool) | Today's session checkmarks |
| `checkHistory` | map(date → map(session → bool)), ≤3660 days | Dated history — unreconstructable |
| `sessionJuz` | nullable int 1–30 | The active session. **These four travel together or not at all:** `sessionDone` is only interpretable *relative to* `sessionJuz`/`sessionIdx`; alone it restores a meaningless array. |
| `sessionIdx` | int 0–2000 | ″ |
| `sessionDone` | array(`^\d{1,2}-\d{1,4}$`), ≤500 | ″ |
| `activeSessionIndex` | int 0–4 | ″ |
| `asrSelectedSurahs` | array(int 1–114), ≤114 | Asr revision **selection** (the pool) |
| `asrSelectedJuz` | array(int 1–30), ≤30 | ″ |
| `goalYears` | int 0–50 | **Methodology** — the goal horizon drives every pace/target figure shown |
| `goalMonths` | int 0–600 | ″ |

**Refused — 7 fields, by name, each with the reason recorded in code:**

| Field | Why refused |
|---|---|
| `notes` | **The user's own written per-juz notes.** Free-form personal text. Transmitting these would turn a progress backup into user-content hosting and move the Play declaration into *User-generated content*. Not needed to restore a single ayah. |
| `dark`, `reciter`, `showTrans` | Cosmetic preferences. |
| `asrReviewBatch` | **Cannot be safely modelled.** Holds materialized verse **objects** straight from the Qur'an API — unbounded shape, carries scripture text. It is *transient* review state, fully rebuildable from `asrSelectedJuz` + `asrSelectedSurahs` + `jalil-asr-cycle`. Nothing to gain by modelling it; a large surface to lose by shipping it. |
| `recentBatches`, `yesterdayBatch` | **Cannot be safely modelled, and are VESTIGIAL.** No code path in the app writes them — the setters are only ever called when *restoring* the blob (`quran-hifz-tracker.jsx:628-629`). Whatever a user holds is legacy data of unknown shape. Display-only; no memorization is lost by dropping them. |

> **Correction.** A previous revision of this document claimed `recentBatches`/`yesterdayBatch`
> "feed the Dhuhr review — dated, unreconstructable". That was inferred from a comment, not from
> the code. The code shows they are never written. They are now excluded, and the claim is
> withdrawn.

### 5.3 Refused keys (20)

Personal content (`rihlat-username`, `rihlat-reflections`), the derived activity feed
(`jalil-recent-activity`), all cosmetic preferences, per-device UI state, reminders (already
stored server-side against the push endpoint — re-sending would duplicate the data and add a
second linkage for no restore benefit), and every identity/analytics key (`alhifz_did`,
`alhifz_counted`, `rihlat-push-enabled`, `rihlat-reminders-fired`).

### 5.4 Value schemas — because a field NAME constrains nothing

A name-only allowlist happily transmits:

```jsonc
"checkHistory": { "2026-07-14": { "fajr": "Today I struggled, and thought about my father." } }
```

…because the field is *called* `checkHistory`, and that was the entire check. The `notes` leak
was this lesson at the key level; this is the same lesson one level further down.

Every transmitted value is now validated against an explicit schema in `progressSchema.js`:
exact type, allowed object shape, permitted nested keys, numeric ranges, key-name patterns,
maximum collection length, maximum key count, and a hard nesting bound. **There is no
`{kind:"string"}` in the DSL** — every string is an enum, or a pattern with a tight maximum
length — which is asserted structurally by a test that walks every schema. Free-form text has
nowhere to survive.

Accepted values are **rebuilt from validated primitives** and re-serialized canonically (keys
sorted at every level). The server refuses a value that is structurally valid but **not
canonical** (`400 NOT_CANONICAL`) rather than silently rewriting it: rewriting would change the
bytes the client checksummed, and accepting as-is would mean storing something other than the
rebuilt value. Refusing keeps *what we store* and *what the client signed* the same object.

**Client vs server strictness.** The client sanitizer **drops** a field whose stored value fails
its schema (localStorage is a decade-old store that may hold legacy junk; one corrupt field must
not cost the user their ayah-completion record). The server **rejects the whole envelope**,
because by then the data has already been through the sanitizer, and anything still malformed is
a broken or hostile client, not a legacy artifact. Neither ever *retains* malformed content.

### 5.5 The shared serializer — a tripwire that is not self-referential

The previous revision's v8 tripwire compared the backup's hand-written field list against the
backup's hand-written test fixture. **That is the backup layer checking itself against itself.**
It could not have detected a new field added to the tracker, which is the one thing it existed
to detect.

Now there is one source of truth. `src/backup/progressSchema.js` owns `V8_PERSISTED_FIELDS` and
`serializeQuranV8()`, and **`quran-hifz-tracker.jsx` persists through it** — the hand-written
`JSON.stringify({...21 fields})` at the persistence effect is gone.

Drift is caught by a chain in which every link fails loudly:

| Change | What fails |
|---|---|
| A new field is added to the tracker's persisted state | The **source check** — a test reads the real `serializeQuranV8({…})` call site in `quran-hifz-tracker.jsx` and diffs its argument list against `V8_PERSISTED_FIELDS` |
| It is added to `V8_PERSISTED_FIELDS` | The **classification tripwire** — it is neither backed up nor excluded |
| It is classified as backed-up | The **schema tripwire** — it has no value schema |
| A field is renamed or removed | The source check (both directions) |
| Someone writes `jalil-quran-v8` directly, bypassing the serializer | A test asserts no hardcoded `setItem("jalil-quran-v8", …)` exists anywhere in the tracker |

**Residual limitation, stated honestly:** the source check is a regex over the real source file.
It is *evidence-based* (it reads what the app actually does, not a copy of it) and it is backed
by shared code rather than replacing it — but a sufficiently creative new persistence path
(e.g. a second module writing the v8 key) would need its own guard. The bypass check above
closes the obvious one. **The claim is not "future fields are impossible to miss"; it is
"the app and the backup read one list, and four independent tests fail if they diverge."**

### 5.6 The key-level tripwires

Asserted in `tests/cloud-backup-contract.test.mjs`:

1. **Subset** — every cloud key is a key the local backup already knows about.
2. **Completeness** — every key the local backup knows about is *consciously classified*:
   transmitted, or explicitly refused. Silence is not a decision.
3. **Disjointness** — no key is both transmitted and refused.
4. **Every transmitted key has a VALUE schema** — a key whose *name* is allowed but whose
   *contents* are unconstrained is exactly the hole §5.4 closes.
5. **No orphan schemas** — a schema for a key we do not transmit means a rename got half done.

Invariants 2 and 4 are not hypothetical. `jalil-recent-activity` (a key) and `notes` (a field)
were each in **neither** list at some point — silently omitted rather than deliberately
excluded. Both are now classified, and both classes of omission fail a test.

An excluded or unknown key/field is **rejected**, never quietly dropped: a client sending notes
is broken or hostile, and we want that loud.

## 6. The envelope (schema v1) — a closed set

```jsonc
{
  "app": "rihlat-al-hifz",
  "kind": "cloud-backup",
  "schemaVersion": 1,
  "backupId":  "…",
  "writerId":  "…",          // random, backup-only; NOT alhifz_did
  "appVersion": "1.6.0",
  "platform":  "web|ios|android",
  "createdAt": "ISO-8601",   // CLIENT clock
  "updatedAt": "ISO-8601",   // CLIENT clock — conflict resolution only
  "encryption": { "alg": "none" },
  "payload":   { "<key>": "<raw localStorage string>" },
  "checksum":  "sha256:<hex>"
}
```

**Everything is an allowlist, and nothing unknown survives.** Unknown top-level fields,
unknown fields inside `encryption`, unknown payload keys, and unknown fields inside the v8
blob are each a **400**. And a validated envelope is **rebuilt from the allowlist** —
`validateEnvelope` returns a *new object* assembled field by field. The caller's object is
discarded and never reaches storage, so a field that somehow evades a check still has no seat
on the thing that gets written.

**Client vs server timestamps are never conflated.** The envelope's timestamps are the
*client's* — untrusted input, used only for conflict resolution. The record's own timestamps
are the *server's* and drive retention. Letting a client clock drive retention would let a
caller pin data forever or expire someone else's early.

### 6.1 Size limits — the outer bound is the whole envelope

| Limit | Bytes | Role |
|---|---|---|
| **`MAX_ENVELOPE_BYTES`** | **1,048,576 (1 MiB)** | **The documented maximum accepted request.** UTF-8 size of the *complete serialized envelope*. |
| `MAX_PAYLOAD_BYTES` | 524,288 (512 KiB) | Sum of raw payload values |
| `MAX_VALUE_BYTES` | 262,144 (256 KiB) | Any single payload value |

The original contract weighed **only the payload**. A 600 KB junk field at the top level
therefore sailed straight through and was stored: the payload was small, the payload check
passed, and nothing else was ever put on the scale.

The envelope bound is now measured **first — before a single field is interpreted** — so it
does not care which field the bytes are hiding in, or whether we happen to know that field's
name. Two independent layers now stop the 600 KB case (weight, and the unknown-field
allowlist); both are regression-tested, including the case where the bytes hide in a field we
*do* recognize.

Sizes are measured in **bytes, not UTF-16 units** — Arabic is multi-byte, and `.length` would
under-count.

## 7. The record, restore points, and idempotency

```
{ recordVersion, current, restorePoints[], revision, createdAt, updatedAt }
```

`current` and every restore point are complete, self-describing envelopes.

**Idempotency is by content**, not by a client-supplied request id: if the incoming checksum
equals the stored one, the write is a no-op — no revision bump, no restore point consumed. A
client retrying a dropped response therefore cannot burn a restore-point slot.

**Preservation.** On a real change, the outgoing `current` is pushed onto the restore-point
stack before the new one takes its place. **The previous valid backup always survives exactly
one write.** Three points are kept (bounding storage at 4 envelopes/user).

**Retention is "untouched", not "unchanged".** Any successful write — including a no-op
re-put — refreshes the clock, so a user who keeps syncing a finished muṣḥaf does not have
their backup expire because the bytes stopped changing.

## 8. Concurrency contract (compare-and-set)

Two devices sync in the same minute. Both read revision 1. Both write. Under a plain
read-modify-write, the second silently replaces the first and **one device's memorization is
gone** — no error, no restore point, nothing to notice. *"Which of your two devices' progress
would you like us to discard?"* is not a question a backend gets to answer by itself.

**The contract, enforced at two levels:**

1. **Client expectation — `If-Match: <revision>`.** A *changing* write against an existing
   record must declare the revision it believes it is updating.
   - omitted → **409**, with `currentRevision`. The client is writing blind; read, merge, retry.
   - stale → **409**, with `currentRevision`, so it can catch up.
   - matching → proceed.
   - A malformed `If-Match` is a **400**, not a shrug — silently treating garbage as "no
     expectation" would downgrade a safe conditional write into the unconditional one this
     mechanism exists to prevent.
   - An **idempotent re-put is exempt**: the content already matches what is stored, so there
     is nothing to lose, and a retry must not be punished for lacking a header.

2. **Adapter compare-and-set — `casPutRecord(ref, expectedRevision, record)`.** The handler's
   `If-Match` check is *not sufficient on its own*: between the handler's read and its write
   there is an `await`, and in a serverless runtime another request can land in that gap. The
   adapter therefore performs the conditional write against the revision the handler actually
   read, and refuses if the world moved. `casPutRecord` is the **only** write path — there is
   no unconditional `putRecord` to reach for by mistake.

**A durable adapter MUST provide the same guarantee at the datastore level, not in JS:**

- **Redis** — Lua via `EVAL` (or `WATCH`/`MULTI`/`EXEC`): read the revision field, compare,
  `HSET` only on match. One round trip, one atom.
- **Postgres** — `UPDATE backups SET … WHERE ref = $1 AND revision = $2`; zero rows affected
  means conflict. Or `SELECT … FOR UPDATE`.

Failing to honour this reintroduces exactly the race it exists to close, so it is asserted by
test at the seam — including a deterministic test that injects a competing write into the gap
between the handler's read and its write.

## 9. Rate limiting and IP pseudonymization

Three buckets, all **failing closed** (the opposite of the push routes, which fail open so a
limiter hiccup never blocks a reminder — a backup write is not time-critical and a client will
retry, but an unmetered write path against an anonymous store is a storage-exhaustion hole).

- **per-IP** — enforced **before authentication**, so a caller with no token is metered too.
  The 401 path is the one an attacker actually uses to guess tokens; metering only
  authenticated requests would leave it as the single unlimited route into the system.
- **per-ref write** (20/h) and **per-ref read** (120/h) — an unlimited read endpoint is an
  offline-guessing oracle.
- **`DELETE` is exempt from the per-ref limit** (the per-IP bucket still applies). Deleting only
  ever *shrinks* storage, and a user who has hit their write cap must still be able to erase
  their data — a 429 on deletion would make *"users can request that their data be deleted"*
  false, and that is a claim we make to Google.

**The raw IP never reaches the storage adapter.** It is HMAC-SHA256'd under a server-side
pepper first, and only the digest is used as a bucket key. It is never logged and never
persisted.

- **HMAC with a pepper, not a bare digest.** A plain `sha256(ip)` is *not* pseudonymization:
  the IPv4 space is 2³², so anyone holding the digests can enumerate every address in minutes
  and recover them exactly. The pepper is what makes the digest unreproducible without
  server-side knowledge, and it never leaves the server.
- **Purpose:** abuse limiting only. **Retention:** the counter's TTL — one hour. Nothing
  derived from an IP outlives that window, and no IP-derived value is ever attached to a
  backup record.
- **Injectable** (hasher and pepper both) so it is testable without touching `process.env`. A
  test asserts the adapter never receives an address.
- **Pepper source:** `BACKUP_IP_PEPPER`. **Unset ⇒ a random, process-ephemeral pepper** —
  deliberately: limiter buckets then do not survive a restart, which is the correct default
  for a foundation packet whose store does not survive one either, and it guarantees this code
  cannot ship with a hardcoded secret. **A durable deployment must set it** (Decision D5).
  This packet introduces no Production secret.

> **Correction on the record:** an earlier comment in `_backup-lib.js` claimed the IP was
> "never stored — only hashed into a counter key". It was not. The raw address was going
> straight into the limiter key. The comment described the intended design while the code did
> something else, which is the most dangerous kind of comment there is.

## 10. Threat model

| Threat | Mitigation | Residual |
|---|---|---|
| **Datastore dump** | Refs are `sha256(domain:token)`. No record maps back to a token or a person. No notes, no name, no IP, no analytics id in any record. | **Payloads are readable by anyone with storage access** (`alg:"none"`) — an anonymous progress blob with nothing identifying attached. Addressed properly only by E2E encryption (D3). |
| **Token guessing** | ≥32 chars base64url. Read path rate-limited; **the unauthenticated 401 path is metered too**. | Distributed guessers are slowed, not stopped. The keyspace makes it hopeless regardless. |
| **Storage-exhaustion flood** | Per-ref + per-IP limits, fail closed. Envelope, payload, and per-value caps. Empty payloads refused. | Shared NAT shares an IP bucket. Tunable; documented. |
| **Oversized field smuggling** | Whole-envelope byte bound, weighed **first**. | — |
| **Arbitrary data parked on the server** | Closed allowlists at four levels (top-level, encryption, payload keys, v8 fields). Envelope **rebuilt** from the allowlist before storage. | — |
| **User's private notes exfiltrated via a progress key** | v8 field-level allowlist: sanitized client-side *before hashing*, re-checked server-side, and pinned by a tripwire that reads the app's real serializer. | — |
| **Free-form text smuggled INSIDE an allowed field** (e.g. `checkHistory`) | Value schemas: exact types, key patterns, ranges, collection caps, nesting bound. No unbounded string exists in the DSL. Values are rebuilt from validated primitives; non-canonical input is refused. | — |
| **A new progress field silently joining the backup** | The app and the backup share ONE field list (`progressSchema.js`), and a source check reads the tracker's real serializer call site. See §5.5 for the residual limitation. | A second, novel persistence path would need its own guard. |
| **Concurrent devices clobbering each other** | `If-Match` + adapter compare-and-set. A stale writer gets 409, never a silent overwrite. | — |
| **Corrupted backup overwrites a good device** | Checksum + core-JSON parse on the way in, **re-validated on the way out** of `/restore` — integrity checked at the last possible moment before the data could do damage. | — |
| **Empty progress destroys a real backup** | `EMPTY_PROGRESS` refusal, computed against the **real** v8 shape (§11). Tested with a newer-timestamped fresh install. | — |
| **Silent auto-restore** | No auto-restore exists. No `OVERWRITE_LOCAL` action exists. | — |
| **Backup joined to analytics identity** | `writerId ≠ alhifz_did`; `alhifz_did` is an excluded key and rejected if sent. | — |
| **IP address leaking into storage** | HMAC-with-pepper before any adapter call; 1-hour TTL; never logged. | The pepper is process-ephemeral until D5 is resolved. |
| **Accidental Production write** | In-memory adapter performs no network I/O and holds no credentials. `assertStoreAllowed()` fails closed on `VERCEL_ENV=production`. A test fails on *any* attempted network call. | — |

**The honest headline:** today the server can read your progress payload. It cannot tell whose
it is, and it never sees your notes. Whether that is acceptable is Decision D3.

## 11. Emptiness — why it is field-aware

`isEmptyProgress()` is the most important safety predicate in the system (Rule 1). The first
revision checked v8 for `completedSessions`, `totalAyahs`, and `memorized` — **none of which
exist**. It was testing an invented shape, so it was, in the v8 dimension, checking nothing at
all.

A *generic* "is this object empty?" test gets it **dangerously wrong in both directions**:

- `sessionsCompleted` is `{fajr:false, …, isha:false}` — **a fresh install always has all five
  keys.** `Object.keys().length > 0` would call a brand-new device "non-empty", and the entire
  empty-progress protection collapses.
- `dailyChecks` always carries a `date` key, for the same reason.
- `juzProgress` is `{juz: versesDone}` — a key whose value is `0` is not progress.

So each field is interrogated for what it actually **means**: a session flag must be `true`, a
juz must have `> 0` verses done, `dailyChecks` must have a checked session that is not the
`date` bookkeeping key, `streak` must be positive. Conservative in the other direction: **any**
sign of real work — one ayah, one finished session, one repetition — makes a payload non-empty.

**Notes and preferences alone never make a backup meaningful.** A user who wrote a note and
picked a reciter but memorized nothing has no progress to back up, and is correctly refused.

## 12. Conflict resolution

`compareBackups(local, remote)` is pure and side-effect-free. It decides what **may** happen —
never what does.

| State | When | Proposed action | Why safest |
|---|---|---|---|
| `NO_REMOTE` | No usable backup on the server | `UPLOAD` | Nothing to lose |
| `NO_LOCAL` | Device empty, server has a backup | `RESTORE_SAFE` | Cannot lose anything — but it **still asks**. A user who reinstalled *to start over* is entitled to start over. |
| `IN_SYNC` | Checksums match | `NONE` | — |
| `LOCAL_NEWER` | Device ahead | `UPLOAD` | We only ever *add* to the server |
| `REMOTE_NEWER` | Backup ahead | `OFFER_RESTORE` | **Ask.** Restoring replaces real local progress |
| `DIVERGED` | Contents differ, clocks agree (±2 min) | `ASK_USER` | **The dangerous one.** No basis to pick a winner, and picking wrong deletes memorization |
| `INCOMPATIBLE_SCHEMA` | Remote written by a newer app | `BLOCK_UPDATE_APP` | An older app cannot safely read a newer shape |

**Clock skew is noise, not evidence.** A 30-second difference between two devices proves
nothing; treating it as proof is how a stale device wins and eats a good backup.

## 13. Retention & deletion policy (proposal)

| Item | Value | Justification |
|---|---|---|
| **Retention** | **400 days from last touch** | Survives a lost phone plus a slow replacement and a full year of seasonal use; short enough that abandoned data does not accumulate forever. Play mandates **no** maximum — only that we *state* one. |
| **Not 90 days** | — | Play offers a deletion badge for auto-deleting within 90 days. For a *backup* feature that is user-hostile: it would silently destroy the thing the user asked us to keep. **Deliberately not adopted.** |
| **Restore points** | 3 behind `current` | Bounds storage at 4 envelopes/user. |
| **Rate-limit counters** | ≤ 1 hour (TTL) | Pseudonymized (HMAC+pepper) IP and ref buckets. No backup content. |
| **User deletion** | `DELETE /api/backup` — erases `current` **and every restore point**, immediately, never rate-limited | Idempotent: deleting an already-deleted backup is a success. |
| **User access** | `GET /api/backup/export` — every byte held, plus the expiry date | An honest answer to "what do you have on me" includes when it goes away. |

## 14. Open decisions (need Jalil)

- **D1 — Is memorization progress a "religious belief"?** Play's Data safety taxonomy has a
  *Personal info → Political or religious beliefs* type. If it applies, this is **special
  category** data under GDPR Art. 9 and the bar rises sharply. **A legal/product judgment; not
  an engineer's, and not an AI's.** (Note: excluding `notes` materially *reduces* the exposure
  here — free-form religious reflection is a far stronger Art. 9 trigger than a completion
  count — but it does not settle the question.)
- **D2 — Token custody.** No accounts means: lose the token, lose the backup. How is it
  surfaced (recovery phrase? QR? file?) and how do we stop users silently losing it?
- **D3 — End-to-end encryption.** The envelope is already shaped for it (`encryption.alg`).
  Adopting it makes the server blind and largely moots D1's storage risk — at the cost of
  making D2 unforgiving.
- **D4 — Durable adapter.** Which store, which region, which subprocessor, namespaced how —
  and it **must** implement compare-and-set (§8). Note the existing Redis env-namespacing
  incident: `alhifz:*` keys must be namespaced per environment *and migrated deliberately*.
- **D5 — `BACKUP_IP_PEPPER` in a durable deployment.** Must be set, or every cold start resets
  the limiter. A deploy-time secret; **not introduced in this packet.**

## 15. Next packet (recommended)

1. **Decide D1 and D3 first.** They change the data model; everything else is cheaper after.
2. **Durable adapter** behind the existing seam — no handler changes, but it **must** honour
   the CAS contract (§8) and set `BACKUP_IP_PEPPER`.
3. **Frontend, in this order:** mint + persist token → *manual* "Back up now" → status /
   restore-point list → restore gated on `compareBackups` + explicit confirmation → **local
   rollback snapshot written before any restore** → "Delete my cloud backup".
4. **Consent screen** before the first upload (opt-in, off by default — this is what keeps
   Play's prominent-disclosure ritual out of scope).
5. **Public web deletion page** (Play B5).
6. **Update `docs/PRIVACY.md` and `src/components/pages/TermsPage.jsx`.** Both currently state
   that *all* memorization data is device-local. **Shipping this feature makes that false**,
   and an inaccurate privacy disclosure is a Play enforcement matter, not a documentation
   chore. **A hard shipping dependency.**
