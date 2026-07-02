# Al-Hifz — Phase 1 Shadow Backup (design, security, roadmap)

**Status: foundation only.** Disabled by default in every environment. Not
enabled, not deployed, not activated. `localStorage` remains the sole source of
truth. The server never reads back, merges, advances, rolls back, or restores
progress in Phase 1 — it only *shadows* it.

## 1. What Phase 1 adds

| Piece | File | Role |
|---|---|---|
| Snapshot contract | `src/backup/snapshotCore.js` | versioned envelope + allowlist + checksum + strict validation + migration (shared by client, server, tests) |
| Anonymous identity | `src/backup/identity.js` | opaque reciter/device ids + device secret (write proof) |
| Client queue | `src/backup/backupClient.js` | dormant-by-default offline queue + retry + Phase-M metrics |
| Manual export | `src/backup/localExport.js`, `ExportPage.jsx` | versioned "Download Progress Snapshot" |
| Feature gate | `api/_lib/gates.mjs` | `ALHIFZ_PROGRESS_BACKUP_ENABLED` (exact `"true"`) |
| Storage adapter | `api/_lib/progress-store.mjs` | Upstash (prod) + in-memory (test), namespace `alhifz:progress-backup:v1:` |
| Backup core | `api/_lib/progress-backup-core.mjs` | proof/idempotency/revision/write-order logic |
| Routes | `api/progress/backup.js`, `api/progress/health.js` | `POST` write-only backup, `GET` safe health |

## 2. Snapshot contract (schema version 1)

Envelope (typed, validated) + `state` (opaque raw localStorage strings):

```
schemaVersion: 1            app: "rihlat-al-hifz"      kind: "progress-snapshot"
snapshotId, reciterId, deviceId  (opaque, [A-Za-z0-9._~-]{8,128})
revision: integer ≥ 0       createdAt: ms epoch        localDate: "YYYY-MM-DD"
timezone, appVersion        checksum: cyrb53(canonical(state))
idempotencyKey: default `${revision}:${checksum}`
state: { <allowlisted localStorage key>: <raw string value> }
```

**Preservation, not reinterpretation.** `state` holds the *raw* string values of
an allowlist of keys (critical → history → preferences; see
`SNAPSHOT_KEY_TIERS`). The memorization payload is never parsed, migrated, or
recomputed by the backup layer, so it round-trips byte-for-byte and is
forward-compatible with future app fields. The core includes
`jalil-quran-v9`, `jalil-quran-v8`, `rihlat-hifz-lock`, `jalil-asr-cycle`,
`rihlat-session-log`, `rihlat-revised-juz`.

**Excluded by construction** (`EXCLUDED_KEYS`): `rihlat-username`,
`rihlat-reflections` (PII/free text), `alhifz_did`/`alhifz_counted` (ids),
`rihlat-reminders*` (synced via push), and in-session/ephemeral counters. No
secret, notification credential, audio, Quran text, SW cache, or unrelated
storage is ever included.

**Validation** (`validateSnapshot`, server boundary): supported schema only
(future → rejected); strict allowlist of top-level fields and state keys
(unknown → rejected); string-only state values (no executable/nested data);
`MAX_SNAPSHOT_BYTES` = 512 KB; checksum must match. **Migration**
(`migrateSnapshot`): ordered pure functions keyed by the old version; v1 is
current, a future version is rejected rather than guessed.

## 3. Feature gate

`ALHIFZ_PROGRESS_BACKUP_ENABLED` — server-only, **never** `NEXT_PUBLIC_`/`VITE_`.
Enabled only for the exact lowercase string `"true"`; missing, blank, `TRUE`,
`1`, `yes`, or padded whitespace all stay **disabled**. While disabled:

- `POST /api/progress/backup` returns a neutral 503 with **zero datastore
  access** (the gate is checked before any store call).
- The client makes **no backup request** (the queue is constructed dormant).
- No retry loop, no extra network request, no user-facing failure.

## 4. Anonymous device-bound identity & authorization

- Client mints `reciterId`, `deviceId` (128-bit) and a 256-bit `secret`, stored
  locally in `alhifz:progress-backup:identity`. Never based on name, email, IP,
  or user agent; never shown in ordinary UI; never logged in full (only a 6-char
  reciter prefix for diagnostics).
- The client sends `reciterId` + `secret` with each backup. The server stores
  only `SHA-256(secret)` as a **verifier** (trust-on-first-use for a new
  reciterId, atomic `SET NX`). Later writes must present a secret that hashes to
  the stored verifier — a caller who *guesses* a reciterId cannot overwrite
  another device's snapshots because they lack the secret. Comparison is
  constant-time.
- **Not** full authentication. Device-bound only. If *all* local identity is
  lost, there is no automatic recovery yet (a later phase adds recoverable
  accounts). This limitation is stated in the export UI copy too.

## 5. Server backup flow (`POST /api/progress/backup`)

Body `{ snapshot, secret }`. Order (see `handleProgressBackup`): gate → store
configured → content-type → body shape → secret shape → migrate+validate
snapshot → **proof** → **save snapshot** (write-by-unique-id; before the
idempotency claim so a failed write never burns the key) → **idempotency claim**
(duplicate → no-op ack) → **revision ordering** (record recent metadata; advance
the *latest pointer* only for a strictly-newer revision) → generic ack.

Response contains only `{ ok, snapshotAccepted, latest?, duplicate?, snapshotId,
revision, savedAt }` — **no payload, no secret, no stack trace**. Errors are
generic (`400 invalid snapshot`, `403 forbidden`, `500 internal`); details are
never returned and only `err.message` is logged (matching the repo convention).

## 6. Storage namespace & retention

All keys under **`alhifz:progress-backup:v1:`** — isolated from `alhifz:push:*`,
`alhifz:reciters`/`opens`/`active:*`, cron dedupe, and any other app:

```
verifier:<reciterId>       SHA-256(secret)             (~13-month TTL, refreshed)
snap:<reciterId>:<id>      the validated snapshot JSON  (~13-month TTL)
latest:<reciterId>         small metadata pointer       (~13-month TTL, refreshed)
index:<reciterId>          LPUSH+LTRIM ring, ≤ 20 metas (bounded; never unbounded)
idem:<reciterId>:<key>     SET NX EX dedupe             (2-day TTL)
```

Writes are idempotent; payload size is bounded; there is no wildcard
enumeration, no unauthenticated listing, and no destructive bulk delete.

## 7. Client queue, offline & retry

Dormant unless `enabled:true`. When active: observes successful local saves
(called *after* the write), debounces bursts into one snapshot, coalesces
unchanged content by checksum, assigns monotonic revisions, and POSTs. Offline
changes are queued and persisted (`alhifz:progress-backup:queue`) so a reload
never loses pending work; the `online` event resumes. Failures retry with
bounded exponential backoff and quarantine an item after `maxRetries`; the queue
is bounded (`queueMax`, keep-newest on overflow) and capped per session. A `503`
from the server puts the client back to sleep (no retry storm). It never blocks
the reciter, never mutates progress, and never shows a scary error.

## 8. Manual export

`ExportPage` gains a "Download Progress Snapshot (.json)" action producing the
versioned snapshot via `downloadLocalExport`. It is a **superset** of the app's
existing raw "Backup & Restore" (it also carries `jalil-quran-v9` and
`rihlat-hifz-lock`), contains no secret/PII/notification data, and never mutates
progress. Restore is intentionally not added here — the copy reads *"Keep this
file safe. Restore support will be added in a later update."*

## 9. Observability (Phase M) — safe metrics only

`backupClient.getMetrics()` returns booleans/counts/timestamps only:
`enabled`, `serverDisabled`, `successCount`, `failureCount`, `droppedCount`,
`lastSuccessAt`, `lastRevision`, `queueLength(Category)`. **Never** ids,
secrets, payloads, endpoints, or PII. `GET /api/progress/health` returns only
`progressBackupEnabled`, `progressStoreConfigured`, `progressBackupReady`, and
the standard `deployment` label. No paid monitoring service, no new account.

## 10. Privacy & data minimization

Anonymous ids only; no name/email/IP/user-agent; free-text reflections and
username excluded; the server stores opaque blobs it never interprets; short
TTLs; bounded indexes; generic errors. The device secret never leaves the device
except as a bearer proof over HTTPS and is stored server-side only as a hash.

## 11. Limitations (Phase 1)

- Device-bound: losing all local identity = no automatic recovery yet.
- No restore, no cross-device sync, no merge. Older revisions are shadow history,
  never promoted; concurrent multi-writer CAS is a later concern.
- Disabled everywhere; unvalidated in a live environment until Preview testing.
- The `latest` pointer uses read-compare-write (fine for the single-device norm);
  strict atomic CAS is a Phase-4 item.

## 12. Roadmap

- **Phase 1 (this):** shadow backups + manual export. Disabled by default.
- **Phase 2:** authenticated/recoverable identities + read-only restore *preview*
  (show what a snapshot contains; no writes to local yet).
- **Phase 3:** controlled restoration with explicit user confirmation and an
  all-or-nothing local write (mirroring the existing raw restore's safety).
- **Phase 4:** cross-device sync with revision/conflict rules (no naïve
  last-write-wins; per-key or CRDT-style merge for `v9`/`session-log`).
- **Phase 5:** admin health dashboard + tested end-to-end backup *restoration*.

## 13. Rollback plan

Everything is additive and gated. To fully neutralize: leave
`ALHIFZ_PROGRESS_BACKUP_ENABLED` unset (the default) — routes become inert and
the client is dormant. To remove entirely: delete `api/progress/`, the two
`api/_lib/progress-*.mjs`, `src/backup/`, and the additive lines in
`gates.mjs`/`AppPageRouter.jsx`/`ExportPage.jsx`/`quran-hifz-tracker.jsx`. No
data migration is required (nothing was migrated); stored shadow keys expire via
TTL or can be dropped by namespace prefix.

## 14. Preview-testing plan (for Mark)

1. Deploy this branch to a **Preview** in the **Al-Hifz** Vercel project only.
2. Set `UPSTASH_REDIS_REST_URL`/`_TOKEN` on Preview (already present) — **do not**
   set them on noortech-share.
3. `GET /api/progress/health` → expect `{progressBackupEnabled:false,
   progressStoreConfigured:true, progressBackupReady:false}`.
4. `POST /api/progress/backup` while the gate is unset → expect a neutral 503 and
   confirm (via Upstash console, if desired) that **no** `alhifz:progress-backup:*`
   key was written.
5. Only to exercise the write path on Preview: temporarily set
   `ALHIFZ_PROGRESS_BACKUP_ENABLED=true` **on Preview**, POST a fake snapshot,
   confirm a single `snap:*`/`latest:*` pair appears under the isolated
   namespace, then unset it again.
6. Verify the app still works with the gate off: My Hifz, Qur'an, Rihlah,
   Haramain, Reminders, Settings → Backup & Restore (both the old export and the
   new "Download Progress Snapshot").

## 15. Production-activation checklist (do NOT run yet)

- [ ] Preview validation (§14) complete and reviewed.
- [ ] Client activation wired to `health.progressBackupReady` (a later change).
- [ ] Retention/quotas confirmed against expected reciter volume.
- [ ] Monitoring of `health` + safe metrics in place.
- [ ] Restore path designed & tested (Phase 2/3) **before** users rely on it.
- [ ] Only then set `ALHIFZ_PROGRESS_BACKUP_ENABLED=true` in **Production**.

> Do not enable Production until Preview validation is complete.
