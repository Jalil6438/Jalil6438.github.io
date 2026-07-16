# Al-Hifz Progress Recovery Platform

Status: local backend implementation only. The platform is disabled unless
`PROGRESS_RECOVERY_PLATFORM_ENABLED=true`. No Preview or Production environment
was changed by this packet.

## Architecture

The recovery platform is an orchestration layer over the accepted cloud-backup
contract. It uses the same capability-derived backup reference and approved
backup Redis credentials, but stores lifecycle state under a separate
environment-scoped keyspace:

`alhifz:recovery:v1:<environment>:record:<sha256>`

The raw capability, backup reference, device identifier, IP address, progress
payload, and Redis credential never appear in a key or log. Production, Preview,
development, and test are explicit namespaces; an unknown or missing
`VERCEL_ENV` fails before storage or restore work.

## Snapshot lifecycle

Snapshots use schema version 3 and carry a stable snapshot ID, domain-separated
backup reference, payload schema, app version, timestamps, opaque source-device
reference, previous snapshot ID, payload hash, bounded record counts, completion
state, and the already validated cloud envelope.

Supported states:

`PREPARING -> WRITING -> VERIFYING -> COMPLETE -> SUPERSEDED`

Invalid stored candidates become `QUARANTINED`; operational failures may be
recorded as `FAILED`. The incoming envelope is validated and normalized before
storage. A candidate is then written atomically with CAS, read back, hash and
record-count verified, moved to `VERIFYING`, read and verified again, and only
then promoted to `COMPLETE` and made latest. An interruption never advances the
latest pointer. Repeating the same content resolves to the original snapshot.

The current cloud-backup contract remains the payload authority. Push endpoints,
VAPID material, authorization headers, raw network data, delivery jobs, leases,
free-form notes, and environment values are excluded. Reminder preferences remain
outside this snapshot because the accepted privacy-reviewed backup contract
explicitly excludes push/reminder state; adding them requires a separate product
and disclosure decision rather than silently widening this packet.

## Restore planning and merge rules

Planning is read-only. It validates local state and the selected completed
snapshot, compares timestamps and schema versions, and returns one of:

- safe full restore;
- local newer;
- remote newer;
- safe merge;
- conflict requiring an explicit choice;
- migration required;
- corrupt, incomplete, or incompatible snapshot.

Monotonic memorization/review collections are unioned and deduplicated. Numeric
progress and streak values use `max`, never addition, so merging cannot inflate a
streak. Boolean completion uses logical OR. Bounded configuration fields use the
newer validated value. A key or nested record missing from the newer side may be
an intentional reset and therefore produces a bounded `possible-reset` conflict;
the backend does not resurrect it by guessing. At most 20 conflict entries are
returned.

## Restore execution protocol

The backend cannot transact against browser or native local storage. It therefore
uses an explicit client-confirmed protocol:

1. `restore-begin` re-plans against the current snapshot.
2. It validates and stores the pre-restore local envelope as a rollback
   checkpoint.
3. It validates the proposed result and persists one idempotent `PREPARED`
   operation before returning the result envelope.
4. The future client applies the result, reloads it, and sends the reloaded
   checksum to `restore-confirm`.
5. Only an exact checksum marks the operation `COMPLETE`.
6. A failed client application calls `restore-rollback`; the validated checkpoint
   is returned and the operation becomes `ROLLED_BACK`.

Repeating begin, confirmation, or rollback is idempotent. A process loss after
preparation leaves the operation recoverable. Incomplete or quarantined snapshots
cannot be forced through with an explicit choice.

## Migrations and integrity

Migrations are ordered one-version steps (`v1 -> v2`, `v2 -> v3`). Every step is
independently testable; a missing step and future schema both fail closed. Unknown
snapshot fields are retained by the migration wrapper where safe, while the
embedded cloud envelope is rebuilt from its strict allowlist.

Every restore verifies the cloud payload checksum, snapshot payload hash,
required fields, payload schema, bounded record counts, opaque ownership
reference, completion state, and the existing 1 MiB envelope limit. Tampered,
truncated, count-inconsistent, incomplete, and future snapshots never overwrite
local progress.

## Retention and health

- Recovery record: 400 days from last successful CAS.
- Snapshots: latest plus up to three prior records.
- Restore operations: latest three.
- Conflicts: latest 20 safe paths/reasons.
- Incomplete work: quarantined after one hour.
- Active prepared-restore source snapshots: protected from cleanup/history
  pressure.

If active protected records would exceed a cap, the operation fails with a safe
capacity conflict instead of evicting recoverable data. Cleanup is one bounded
CAS over the current capability's small record; it performs no Redis scan and is
safe to repeat.

The capability-protected `GET /api/recovery` health response contains only
storage/environment readiness, latest safe metadata, state counts, timestamps,
schema versions, migration readiness, and retention expiry. It contains no
payload, token, identifier, endpoint, credential, or raw error.

## Rollout and rollback

1. Keep `PROGRESS_RECOVERY_PLATFORM_ENABLED=false` everywhere by default.
2. Independently audit the exact commit and tests.
3. Enable only in a protected Preview with Preview-scoped backup Redis values.
4. Exercise interrupted writes, two-device CAS, migrations, restore confirmation,
   rollback, retention, and health against real Redis.
5. Complete a separate mobile/client packet that applies and reloads results.
6. Obtain Safiyah review and Jalil's explicit Production authorization.

Rollback is non-destructive: disable the flag and redeploy. Existing recovery
records remain isolated and expire under retention; no deletion or migration is
required to return to the accepted backup behavior.

## Evidence status

- Verified by automated test: snapshot model, ordered migrations, atomic CAS,
  idempotency, write interruption, corruption quarantine, pointer safety,
  restore planning, deterministic merge, reset conflicts, prepared restore,
  checksum confirmation, rollback, active-record protection, retention cleanup,
  health bounds, route authorization, and environment isolation.
- Verified locally: focused and full tests, changed-file lint, production build,
  whitespace, scope, fixture, and secret scans.
- Requires hosted Preview verification: actual Redis Lua/CAS behavior, 400-day
  TTL, concurrent device writes, payload-size limits, and failure injection.
- Requires mobile restore verification: apply/reload/confirm and rollback on iOS,
  Android, and PWA storage.
- Requires Production authorization: feature-flag enablement and any disclosure
  update associated with activating cloud recovery.

## Preview integration gate

The learner UI is independently gated by `VITE_PROGRESS_RECOVERY_ENABLED=true`.
Both recovery flags are false by default. Preview must set both flags;
Production must leave both absent or false. The API derives its environment
exclusively from server-side `VERCEL_ENV`; request bodies cannot select a
namespace.

The browser keeps an unguessable recovery capability, backup id, and independent
writer id in local storage. Those values are never included in the recovery
payload or displayed in the restore preview. The capability is the approved
anonymous authorization boundary: there are no accounts in this architecture.
Consequently, an account or secure capability-transfer design is still required
before a learner can discover the same record after a fresh install on another
device. Preview multi-device tests reuse one synthetic capability explicitly and
do not claim that product onboarding problem is solved.

Restore planning returns a ten-minute proof bound to the capability-derived
record, snapshot id, local payload checksum, and recovery-state revision. Any
newer write, expired proof, or modified proof forces a fresh preview. A prepared
operation remains idempotently resumable by its operation id.

The client sequence is:

`View recovery -> Preview changes -> Confirm -> Apply -> Reload -> Verify`

The local write uses the existing all-or-nothing allowlisted restore helper.
Only approved progress domains are applied; reminder preferences, push data,
analytics identifiers, names, notes, and cosmetic settings remain untouched. A
30-minute marker records only bounded operation metadata, permits one reload,
and then verifies the restored payload checksum with the server.

## Real Preview Redis smoke check

Run only against a committed Vercel Preview deployment:

```powershell
$env:VERCEL_ENV = "preview"
$env:RECOVERY_PREVIEW_CONFIRM = "preview"
$env:RECOVERY_PREVIEW_URL = "https://<preview-deployment>.vercel.app"
$env:PROGRESS_RECOVERY_PLATFORM_ENABLED = "true"
$env:BACKUP_STORE_ADAPTER = "redis"
# BACKUP_REDIS_REST_URL and BACKUP_REDIS_REST_TOKEN come from encrypted Preview env.
npm run recovery:preview-check
```

The script refuses Production, verifies `/api/version` reports `preview`, uses a
random synthetic capability, and checks snapshot creation, 400-day TTL, atomic
CAS conflict handling, stale-plan rejection, restore preparation, rollback,
confirmation, corruption quarantine, and complete record deletion. It never
prints credentials, capabilities, Redis keys, or progress payloads and returns
nonzero on any failed assertion. Cleanup also runs in `finally`.

Required Preview environment names:

- `PROGRESS_RECOVERY_PLATFORM_ENABLED=true`
- `VITE_PROGRESS_RECOVERY_ENABLED=true`
- `BACKUP_ENABLED=true`
- `BACKUP_STORE_ADAPTER=redis`
- `BACKUP_REDIS_REST_URL`
- `BACKUP_REDIS_REST_TOKEN`
- `BACKUP_IP_PEPPER`

Production is not configured or enabled by this packet.
