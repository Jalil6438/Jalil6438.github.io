# Al-Hifz Phase 3 — Controlled restore foundation

**Status:** implemented behind a disabled-by-default gate. **Not deployed. Not
enabled anywhere. Production activation is NOT approved.**

Phase 3 adds an explicit, carefully-gated **restore** on top of the validated
Phase-1 shadow-backup and Phase-2 read-only recovery work. It lets a reciter, on
a fresh installation and only after proving they hold a valid recovery code,
**replace** this device's memorization progress with their server backup. It is
not synchronization, it never merges, and it never runs automatically.
`localStorage` remains the sole source of truth; restore is the one explicit,
user-driven moment where a validated server snapshot is written back to it.

---

## 1. Where restore sits

- **Phase 1 — backup:** write-only shadow of local progress (device-bound).
- **Phase 2 — recovery + preview:** a user-held recovery code proves, from a
  later install, that a backup exists and shows a safe summary. **No restore.**
- **Phase 3 — controlled restore (this doc):** a two-step, single-use,
  device-bound restore that the reciter triggers explicitly and confirms.

Everything is off by default and independent: the restore gate can be enabled
for Preview validation without touching the backup or recovery switches.

---

## 2. Feature gate

`ALHIFZ_PROGRESS_RESTORE_ENABLED` — server-only, exact-match `"true"` (missing /
blank / `"TRUE"` / `"1"` / `"yes"` → **disabled**). Independent of
`ALHIFZ_PROGRESS_BACKUP_ENABLED` and `ALHIFZ_PROGRESS_RECOVERY_ENABLED`.

While disabled: `restore-prepare` and `restore-execute` perform **zero**
datastore access (the gate is checked first, inside the core, before any read
or write) and return a neutral, non-alarming body. The client never exposes a
Restore action, and local progress behavior is unchanged. A blank placeholder is
documented in `.env.example`. **Left blank in Production.**

---

## 3. Serverless-function budget (no new function)

The Vercel Hobby plan allows ≤ 12 Serverless Functions; the deployment already
ships exactly 12. Phase 3 therefore adds **no** new function: the two restore
actions are folded into the existing consolidated recovery route
`api/progress/recovery/[action].js`, which now dispatches four strictly
allowlisted actions:

```
/api/progress/recovery/setup            (Phase 2 — register/rotate verifier)
/api/progress/recovery/preview          (Phase 2 — read-only summary)
/api/progress/recovery/restore-prepare  (Phase 3 — Step A)
/api/progress/recovery/restore-execute  (Phase 3 — Step B)
```

Recovery and restore have **separate** gates; a restore action is disabled
unless the restore gate is on, regardless of the recovery gate.

---

## 4. Two-step flow

### Step A — `restore-prepare`

Client sends `{ recoveryToken, targetDeviceId, confirmRestoreIntent: true }`.
The server:

1. checks the restore gate (disabled → zero datastore access);
2. validates the target-device id shape and the explicit intent flag;
3. throttles per reciter (shared with the recovery attempt window);
4. verifies the recovery proof exactly as the read-only preview does — a wrong
   secret or a reciterId-only guess is indistinguishable from "no reciter";
5. requires an **existing, valid** backup: it reads the latest pointer, then
   reads and **re-validates** the actual snapshot, binding its checksum;
6. mints a short-lived, single-use **restore authorization** and stores only a
   verifier + non-sensitive binding metadata;
7. returns a sanitized preview (schema, revision, saved date, freshness) and the
   authorization token.

Never accepts a reciterId alone as proof. Never returns raw progress, a
checksum, a device id, or any datastore key.

### Step B — `restore-execute`

Client sends `{ authorization, targetDeviceId, confirmFinalRestore: true }`.
The server:

1. checks the gate;
2. validates the target-device id shape and the final-confirmation flag;
3. **atomically consumes** the authorization (Redis `GETDEL` / in-memory
   fetch-and-delete) — the first executor gets the record and removes it in one
   op; a reused / expired / unknown authorization yields nothing. **Any** execute
   attempt burns the authorization, so reuse and wrong-device/secret attempts
   cannot replay or brute-force;
4. enforces expiry, then constant-time-verifies the authorization secret and the
   target-device binding;
5. reads the bound snapshot and **re-validates** it (schema, size, checksum) and
   confirms it is exactly the snapshot the authorization was minted for;
6. returns the exact validated snapshot envelope.

The server does **not** write any client storage — applying is the client's
explicit, atomic responsibility.

---

## 5. Restore authorization

Format (server-minted, opaque to the client between the two steps):

```
AR1.<reciterId>.<authId>.<secret>
 │      │           │        └ 256-bit random secret (64 hex) — verifier material
 │      │           └ 128-bit random lookup handle (32 hex)
 │      └ opaque reciterId the auth is bound to (32 hex)
 └ version marker
```

Properties (all tested):

- **cryptographically random** — fresh `authId` + `secret` per mint;
- **short-lived** — 10-minute TTL; the record self-expires and expiry is also
  enforced on execute;
- **single-use** — atomic consume on the first execute;
- **bound to the reciter** — keyed by `(reciterId, authId)`; a different
  reciterId cannot locate or use it;
- **bound to the target device** — a SHA-256 of the fresh install's opaque
  `deviceId`; a different device is rejected;
- **stored only as hashes** — `SHA-256(secret)` and the device-binding hash,
  never the raw secret or the raw device id;
- **carries no raw progress** and **reveals no datastore key**.

Namespace: `alhifz:progress-backup:v1:restore:` (isolated from backup, recovery,
push, and stats).

---

## 6. Client atomic apply

`executeRestore` returns the envelope; `applyRestoredSnapshot` then, purely and
all-or-nothing:

1. **re-validates** the schema / version / checksum (rejects invalid,
   unsupported, or corrupt snapshots — no write);
2. **classifies the conflict** (see §7) and requires explicit — and, for risky
   conflicts, **stronger** — confirmation before writing;
3. takes a **local pre-restore backup** of the allowlisted key surface;
4. **applies atomically**, making the allowlisted surface *exactly* equal the
   snapshot (present keys set, absent keys removed) — a clean replace, never a
   merge; any write error **rolls back** to the pre-restore state;
5. **verifies** the resulting checksum equals the snapshot; a mismatch **rolls
   back**;
6. records a **metadata-only** restore receipt (no payload, no secret).

Local keys: `alhifz:progress-backup:pre-restore` and
`alhifz:progress-backup:restore-receipt`.

### Progress protected

The snapshot's `state` is written back byte-for-byte, so every Phase-1 field
round-trips: completed ayahs (`jalil-quran-v9`), juz progress / status, session
index, daily session state, yesterday batch, Asr review batch, Asr rotation
pointer, Isha lock, streak, current position, and all history/preference keys.
Because restore only writes the same allowlisted keys the app already reads and
injects nothing, the **one-page daily cap, five-session methodology, and
Fajr-opening / Isha-locking behavior are unchanged** — they are governed by the
app's normal logic reading the restored values. Restore cannot bypass the
methodology.

---

## 7. Conflict handling

Classifications: `no-local`, `remote-newer`, `local-newer`, `same-revision`,
`uncertain`. Revisions are authoritative when both are known; otherwise
timestamps; otherwise `uncertain`. Rules:

- no automatic overwrite when local appears newer;
- `same-revision` is surfaced as **unnecessary** and not auto-applied;
- `local-newer` and `uncertain` require a **stronger** explicit acknowledgement;
- **no field-by-field merge, no best-guess reconciliation, no silent downgrade.**

The UI shows the remote backup date, the revision comparison, whether local
progress will be replaced, that this is **not** synchronization, and that the
recovery code stays private.

---

## 8. Offline & failure safety

The flow fails safely — with the pre-restore state preserved and no partial
write — when: offline before/during preparation, the connection drops before
execution, the authorization expires or was already consumed, local storage
quota fails, snapshot validation fails, the browser closes mid-flow, or
post-restore verification fails. Restore is **never** retried automatically,
**never** reuses a consumed authorization, and is **never** queued for
background execution.

**Service worker:** the progress endpoints (`/api/progress/*`) are registered
**network-only** for every method, with **no** Background Sync queue and **no**
`sync` / `periodicsync` handler anywhere — so a failed restore request can never
be replayed after the fact. No automatic restore runs on app startup.

---

## 9. Security summary

Isolated keys under the established backup namespace; constant-time verifier
comparisons; strict schema validation; short TTLs; one-time authorization
consumption; opaque identifiers; generic authentication failures; per-reciter
throttling shared with recovery. The server never stores or logs names, emails,
phones, IPs, user agents, raw recovery tokens, raw restore authorizations, raw
device secrets, or progress payloads. Upstash key names are never exposed to
clients.

---

## 10. Limitations & next steps

- Restore replaces the **whole** allowlisted surface with one snapshot — there is
  intentionally no partial restore and no merge.
- It restores the **latest** snapshot only (no history browser yet).
- Device binding uses the fresh install's opaque `deviceId`; the true credential
  is the single-use authorization secret.
- **Not enabled or deployed.** Production restore requires Preview validation and
  explicit authorization from Mark, and must never be turned on alongside a
  continuous-sync or cross-device-merge feature (neither of which exists).
