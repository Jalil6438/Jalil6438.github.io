# Al-Hifz Phase 2 — Read-only recovery code + recovery preview

**Status:** implemented behind a disabled-by-default gate. **Not deployed. Not
enabled anywhere. Production activation is NOT yet approved.**

Phase 2 adds a user-held **recovery code** and a **read-only recovery preview**
on top of the validated Phase-1 shadow-backup foundation. It lets a reciter
prove — from a *later* installation — that a server backup exists and see a safe
summary of it. It deliberately does **not** restore, merge, sync, or mutate any
progress. `localStorage` remains the sole source of truth.

---

## 1. Why this exists (and its hard limits)

Phase-1 backup is **device-bound**: the backup secret lives only on the original
device. If that device is lost, there is no way to prove ownership of the
server backup. Phase 2 introduces an **independent** credential — the recovery
code — that the reciter creates *while they still have the device* and stores
somewhere safe. Later, on a new install, they can enter it to **verify** the
backup.

**This phase cannot restore progress.** It is a read-only preview only. Restore
is a separate, later, carefully-gated phase.

Two hard truths, stated plainly to the user in the UI and here:

- **Recovery setup must happen *before* the original device is lost.** A
  recovery code cannot be created once the device (and its identity) is gone.
- **Losing the recovery token means recovery remains unavailable.** The server
  stores only a hash; there is no back channel to reconstruct the secret.

---

## 2. Recovery-token format

```
AH1.<reciterId>.<secret>
 │      │            └ 256-bit random secret, 64 lowercase hex chars
 │      └ opaque reciterId (the same 128-bit / 32-hex handle identity.js mints)
 └ version marker ("AH" = Al-Hifz, "1" = token generation 1)
```

- Single source of truth: [`src/backup/recoveryToken.js`](../../src/backup/recoveryToken.js)
  — imported by both the browser client and the serverless route, exactly like
  `snapshotCore.js`, so the two can never disagree about the format.
- Dot-separated, all-hex fields → unambiguously parseable, no delimiter
  collisions, strict per-field regex validation.
- Carries **no** name, email, phone, IP, user-agent, or memorization progress —
  only the opaque (random) reciterId and fresh random secret material.
- A well-formed but **unsupported** version fails safely (never reinterpreted);
  a malformed token is rejected by `parseRecoveryToken` without throwing.

### Entropy

The secret is **256 bits** (`RECOVERY_SECRET_BYTES = 32`), generated with secure
browser randomness (`crypto.getRandomValues`), matching the strength of the
Phase-1 device secret. If no secure RNG is available the generator throws rather
than emit weak material.

---

## 3. Server verifier handling

The server **never** stores the raw recovery secret. On setup it stores only:

| Field | Notes |
|-------|-------|
| recovery-token version | e.g. `"AH1"` |
| opaque reciterId | implicit in the key |
| verifier | `SHA-256(recovery secret)`, hex |
| createdAt | server clock, ms |
| rotatedAt | null until a rotation |
| schemaVersion | recovery metadata schema (`1`) |

Verifier comparison is **constant-time** (`constantTimeEqual`) to avoid leaking
match length via timing. See [`api/_lib/recovery-core.mjs`](../../api/_lib/recovery-core.mjs).

---

## 4. Setup authorization (`POST /api/progress/recovery/setup`)

Registering or rotating a recovery verifier **requires the Phase-1 device
proof** — the device secret that hashes to the reciter's device verifier:

1. Feature gate checked first (disabled ⇒ zero datastore access).
2. Store-configured check.
3. Method + `application/json` content-type.
4. `deviceSecret` validated (64-hex) and the recovery token parsed.
5. **Device ownership proven** against the reciter's device verifier
   (trust-on-first-use for a brand-new reciterId, mirroring the backup route; an
   existing verifier must match, else `403`).
6. Only `SHA-256(recovery secret)` is stored — never the raw token/secret.
7. **Idempotent**: re-submitting the *same* token returns a success no-op.
8. A *different* token via plain setup returns `409` — replacing an existing
   code must go through explicit **rotation**.
9. Generic errors only; no stack trace, payload, or secret is ever logged.

> A caller who knows only a reciterId (but not the device secret) can neither
> register nor replace its recovery verifier.

---

## 5. Rotation

Rotation (`rotate: true` on setup) mints a **new** token locally, proves current
device ownership, then **replaces** the verifier. The old token's secret hashes
to a different verifier and is therefore invalid immediately. Rotation is never
automatic and requires explicit user confirmation in the UI. There is **no**
recovery-token reset path that bypasses current-device proof.

---

## 6. Read-only preview (`POST /api/progress/recovery/preview`)

Input: **the recovery token only.** Behavior:

1. Feature gate + method + content-type checks.
2. Parse the versioned token; a malformed token returns the uniform
   "nothing to show" body without touching the datastore.
3. **Throttle first** (see §7), then compare `SHA-256(secret)` to the stored
   verifier in constant time.
4. On success, read **only** the latest-snapshot *metadata* and return a
   sanitized summary. On any failure, return a generic body.

### Safe summary fields returned

`ok`, `backupFound`, `schemaVersion`, `latestRevision`, `savedAt`, `localDate`,
`snapshotAge` (a coarse bucket: `recent` / `this-month` / `months` / `old`).

### Never returned

Raw snapshot state, any `localStorage` string, the recovery verifier, the
recovery token, the device secret, the backup secret, notification data, Upstash
key names, deviceId, checksum, snapshotId, or any other reciter's record.

### Indistinguishable failures

A **nonexistent reciterId**, an **incorrect secret**, and a **missing verifier**
all return the identical `{ ok: true, backupFound: false }` body, so an attacker
cannot use the endpoint as an existence oracle.

> High-level progress *counts* are intentionally **not** returned: the server
> stores snapshot payloads as opaque blobs and never parses them, so no counts
> exist in the metadata to expose. This is a deliberate limitation, not an
> oversight.

---

## 7. Attempt throttling

- Keyed by an **opaque target id** = `SHA-256("alhifz:recovery-target:" + reciterId)`
  (first 32 hex). The raw token, secret, and reciterId are **absent** from the
  rate-limit key.
- Bounded to `RECOVERY_MAX_ATTEMPTS` (default **10**) per short window.
- Over the limit → a fixed generic **`429`** (`too many attempts`).
- Short TTL: `RECOVERY_ATTEMPT_TTL_SECONDS` = **15 minutes**. No permanent
  lockout — the counter simply ages out, and a **successful** preview clears the
  window immediately.
- No wildcard cleanup; deterministic unit tests cover the counter policy.

**Documented DoS limitation:** because throttling is **per-reciter**, an attacker
who knows a target reciterId can deliberately trip that reciter's window and
cause *that reciter's own* recovery preview to be throttled for up to the TTL.
This is a bounded nuisance (self-healing in ≤15 min, never a lockout), chosen
over per-IP limiting because we intentionally store **no IP addresses**. No paid
rate-limiting service is used.

---

## 8. Feature gate & disabled behavior

`ALHIFZ_PROGRESS_RECOVERY_ENABLED` — server-only, **exact lowercase `"true"`**
enables. Missing / blank / `TRUE` / `1` / `yes` / whitespace all remain
disabled. Never `NEXT_PUBLIC_`/`VITE_`. Independent of the backup gate.

When disabled (the default everywhere):

- setup and preview perform **no** datastore access (clean `503`);
- the client makes **no** recovery request (the UI is not even surfaced —
  `AppPageRouter` hides it unless the health probe reports the gate on);
- current backup behavior and `localStorage` behavior are unchanged;
- no alarming user-facing error appears (the disabled body is neutral).

Health (`GET /api/progress/health`) adds three **booleans only** —
`progressRecoveryEnabled`, `progressRecoveryStoreConfigured`,
`progressRecoveryReady` — and never exposes a secret, URL, id, hash, path, or
key name.

---

## 9. Storage namespace

All recovery keys live under the **existing** isolated root, in a clearly
separated `recovery:` sub-namespace:

```
alhifz:progress-backup:v1:recovery:verifier:<reciterId>
alhifz:progress-backup:v1:recovery:meta:<reciterId>
alhifz:progress-backup:v1:recovery:attempt:<opaque-targetId>
```

These cannot collide with `snap` / `latest` / `index` / `idem` / `verifier`,
nor with notification (`alhifz:push:*`), statistics
(`alhifz:reciters` / `opens` / `active:*`), or another app on the shared
codebase. No wildcard enumeration; no unrestricted backup listing.

---

## 10. Privacy & threat model

- **Stored:** opaque reciterId (random), `SHA-256` verifiers, coarse timestamps,
  schema/version. **Never stored:** raw secrets, names, emails, phones, IPs,
  user-agents, or parsed progress.
- **Never logged:** the recovery token, raw secret, device secret, full
  reciterId, progress payload, or notification data.
- **Anyone who holds the recovery token can view that reciter's backup
  *summary*** (never restore, never the raw state). This is inherent to a
  device-independent recovery credential and is stated to the user verbatim:
  *"Anyone with this recovery code may be able to view your backup summary. Keep
  it private."*
- Device-secret compromise is out of scope (unchanged from Phase 1). A guesser
  who knows only a reciterId can neither register/rotate recovery nor pass
  preview.

---

## 11. Read-only guarantees

The preview path may only **read** snapshot metadata and **write** the
short-lived attempt counter. It provably does not: write `localStorage`, modify
progress, update the latest pointer, create a snapshot, change the Isha lock,
streak, or Asr state, complete a session, invoke restore, or invoke the backup
queue. Covered by `tests/recovery-preview.test.mjs` (a guarded store whose every
mutating write throws) and `tests/recovery-methodology.test.mjs` (byte-identical
snapshot before/after).

---

## 12. Limitations

- Verify-only — **no restore** in this phase.
- Per-reciter throttling has the bounded DoS nuisance described in §7.
- No progress counts in the summary (opaque blobs, by design).
- Requires the reciter to have created the code *before* device loss.
- Requires at least one prior backup for `backupFound: true` (otherwise the
  preview authenticates but reports no backup yet).

---

## 13. Preview-testing checklist

1. Set `ALHIFZ_PROGRESS_RECOVERY_ENABLED=true` **for Preview only** (and the
   Upstash vars, already validated in Phase 1). Do **not** touch Production.
2. `GET /api/progress/health` → `progressRecoveryEnabled/Ready: true`.
3. With backup enabled + at least one snapshot stored, from the original device:
   open **Settings → Backup & Restore → Create Recovery Code**; save the code.
4. On a fresh install/profile: **Recovery Preview** → paste the code → confirm a
   safe summary (date, revision, freshness) and the "no progress changed" notice.
5. Wrong/edited code → generic "no backup found"; hammer it → generic `429`.
6. Rotate the code from the original device; confirm the old code stops working.
7. Confirm no secret/token/key-name appears in any response or log.

---

## 14. Rollback plan

- **Instant disable:** unset `ALHIFZ_PROGRESS_RECOVERY_ENABLED` (or set to
  anything other than `true`). Both routes immediately become inert `503`s with
  no datastore access; the client UI disappears. No data migration needed.
- **Full revert:** the branch is additive — reverting it removes the routes,
  gate, store methods, and UI with zero impact on Phase-1 backup or methodology.
- Recovery records age out via TTL (~13 months for verifiers; 15 min for attempt
  counters) and are confined to the isolated `recovery:` sub-namespace.

---

## 15. Production prerequisites (NOT yet approved)

- Successful Preview validation of the full checklist (§13).
- Mark's explicit authorization to enable recovery in Production.
- A decision on the eventual, separately-gated **controlled restore** phase
  (with its own confirmation, conflict handling, and audit) — out of scope here.
