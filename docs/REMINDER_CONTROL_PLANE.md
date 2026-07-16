# Al-Hifz Reminder Delivery Control Plane

Status: local implementation only. The feature flag is off by default and no
Preview or Production environment was changed by this packet.

## Architecture

`/api/cron/send-reminders` retains the accepted direct dispatcher unless
`REMINDER_CONTROL_PLANE_ENABLED=true` in that deployment scope. With the flag
enabled, each authenticated 15-minute trigger creates or reuses one durable job
and invokes one bounded worker pass.

Job states:

`QUEUED -> PROCESSING -> COMPLETED | PARTIAL_FAILURE`

`PROCESSING -> RETRY_PENDING -> PROCESSING -> DEAD_LETTER`

An operator may move eligible work to `CANCELLED`, or perform one protected
manual retry of a dead-letter job.

Jobs are Redis hashes. The queue is a sorted set. State indexes are sets.
Receipts are capped lists. Every key uses the existing `envNamespace()` prefix,
so Production, Preview, development, and tests cannot share records. Missing or
unknown environments fail before job creation, subscription reads, or sends.

## Idempotency and claiming

The idempotency key is SHA-256 over environment, reminder type, the UTC
15-minute schedule window, and session scope. It expires after 7 days. Duplicate
QStash/Vercel triggers return the original job; completed jobs are not queued and
therefore cannot resend.

The job retains the exact first trigger timestamp for due-session calculations;
only the idempotency key is rounded. Reminder timing and grace-window behavior
therefore remain identical to the accepted direct dispatcher.

Creation, worker claims, state transitions, and dead-letter actions use Redis
Lua operations. A processing job stays in the sorted queue at its lease-expiry
time. The five-minute lease prevents concurrent workers; if a worker disappears,
the job becomes claimable after expiry without an unbounded recovery scan. An
expired `PROCESSING` lease consumes a retry attempt even after a batch cursor has
advanced, so a persistent mid-batch crash eventually reaches `DEAD_LETTER`;
ordinary queued batch continuation does not consume an attempt.

The worker reads subscriptions with `HSCAN COUNT 100`. One cron invocation may
drain at most 10 worker passes and 20 seconds of work; this lets ordinary
multi-batch jobs finish without allowing an unbounded serverless run. Any
remainder stays durably queued for the next invocation. Successful targets
retain the existing per-subscription/session/day delivered marker. Permanent
`404/410` targets are removed. Temporary failures preserve subscriptions and
release the short delivery lock.

## Retry and dead letters

Maximum attempts: 5. Retry bases are 1 minute, 5 minutes, 15 minutes, and
60 minutes, each with bounded +/-20 percent jitter. A valid provider Retry-After
value can extend (never shorten) that delay, capped at 24 hours. Exhaustion moves
the job to `DEAD_LETTER`; there is no automatic infinite loop.

The protected `/api/reminders/control` endpoint uses `CRON_SECRET` and supports:

- `GET`: bounded health and at most 20 dead-letter summaries.
- `POST {"action":"retry","jobId":"..."}`: one manual dead-letter retry.
- `POST {"action":"cancel"|"resolve","jobId":"..."}`.
- `POST {"action":"cleanup"}`: bounded stale-index cleanup.

It never returns endpoints, push keys, authorization headers, provider bodies,
or raw network identifiers.

## Retention

| Record | Retention / bound |
|---|---|
| Idempotency key | 7 days |
| Job hash | 30 days |
| Delivery receipts | 30 days, latest 500 per job |
| Worker lease | 5 minutes |
| Operational timestamp summary | 30 days after the latest transition |
| Queue/state cleanup | At most 100 index entries per invocation |
| Health/dead-letter output | Counts plus at most 20 job summaries |

TTL expiry removes payload records. The idempotent cleanup action removes only
state/queue references whose job hash has already expired; it never deletes an
active job or a live lease.

## Crash model

This is the strongest practical at-least-once design available through Web Push,
not an exactly-once claim. If a worker crashes after the delivered marker is
written, lease recovery re-scans safely and the marker suppresses a resend. If
the process dies in the narrow gap after a provider accepted a push but before
the delivered marker was persisted, the provider offers no transaction or
idempotency API, so a later retry can duplicate that notification. Receipts and
job summaries may also undercount a delivery if the marker was persisted before
the receipt write; notification deduplication remains the priority.

## Activation and rollback

1. Deploy the code to a protected Preview with the flag absent/false. Confirm
   the direct path still passes device reminder tests.
2. Provision Preview-scoped Redis/push variables and set the flag to `true` only
   in Preview.
3. Verify QStash duplicate triggers, lease recovery, provider failure injection,
   health output, dead-letter controls, and closed-app device delivery.
4. Keep Production false until independent audit, Safiyah review, and Jalil's
   explicit authorization.
5. Rollback is non-destructive: set the flag false and redeploy. Existing jobs
   remain namespaced and expire under their TTLs; the accepted direct dispatcher
   resumes without data migration.

## Evidence status

- Verified by automated test: model, idempotency, claims, lease recovery,
  retries, dead letters, receipt bounds, cleanup, environment isolation, route
  protection, direct-path fallback, and simulated crash recovery.
- Verified locally: full test suite, focused lint, production build, diff and
  secret checks.
- Requires hosted Preview verification: actual Upstash Lua/HSCAN behavior,
  serverless lease recovery, protected health route, and flag rollback.
- Requires QStash/Vercel verification: duplicate trigger behavior and scheduler
  request compatibility.
- Requires founder authorization: Production flag activation and mobile
  closed-app validation.
