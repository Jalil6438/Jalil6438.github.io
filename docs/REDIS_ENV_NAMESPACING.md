# Al-Hifz — Redis Environment Namespacing (rollout & migration)

Backend Hardening Phase 1, item 2. Every reminder and stats Redis key is now
prefixed with the deployment environment so Preview/local can never read or write
Production data.

## What changed

- `api/_push-lib.js` adds `envNamespace()` + `nsKey(base)` and key builders
  (`subsKey`, `logKey`, `sentKey`, `procKey`, `testLimitKey`, `subLimitKey`,
  `subDeleteLimitKey`).
- `VERCEL_ENV` → prefix: `production → prod:`, `preview → preview:`,
  `development → dev:`. Example: `prod:alhifz:push:subs`, `preview:alhifz:opens`.
- **Fail closed:** a missing or unrecognized `VERCEL_ENV` throws; each handler
  turns that into a safe non-write response (`subscribe`/`test`/`cron` → 503;
  `stats` → zeros `configured:false`). Nothing is ever written to a default or
  Production keyspace by accident.
- Tests set `VERCEL_ENV=test`, which produces a separate `test:` prefix. Test
  execution therefore cannot read or mutate Preview or Production records.
- All handlers (`subscribe`, `test`, `cron/send-reminders`, `stats`) resolve keys
  through these builders at **call time**; tests import the same builders so key
  names can never drift.

## Isolation guarantee

Because the prefix is derived from `VERCEL_ENV` and unknown/missing values fail
closed, a Preview deployment (`preview:*`) and local/dev runs (`dev:*`) cannot
touch Production (`prod:*`) subscriptions or stats. This is the code-level
enforcement of what previously depended entirely on separately-scoped Upstash
credentials.

## Migration / rollout condition

This packet **does not deploy and does not touch any Production data.** It only
introduces the namespaced code on the branch. When the v1.6.0 branch is later
promoted to Production, the environment resolves to `prod`, so keys become
`prod:alhifz:*`. That has two consequences, handled as follows:

### Reminder push subscriptions — no migration needed
The reminder backend (`api/push/*`, `api/cron/*`) is **not in Production today**
(Production is v1.5.3, which has no reminder endpoints). So there is no Production
subscription data to move. Any subscriptions created on Preview live under the
Preview keyspace; on the next app open `autoResync()` re-registers each device, so
Preview subscriptions self-heal into the correct namespace. No action required.

### Stats counters — one-time COPY at prod deploy (the migration condition)
`/api/stats` has been live in Production, accumulating counts under the **bare**
keys (`alhifz:opens`, `alhifz:reciters`, `alhifz:countries`, `alhifz:active:*`,
`alhifz:users`, `alhifz:installs`). After the namespaced deploy, Production reads
and writes `prod:alhifz:*`, so historical counts would appear to reset unless the
existing keys are copied first.

**Rollout step (run once, by Jalil/ops, at or just before the v1.6.0 prod
promote — NOT part of this packet):** COPY each live key to its `prod:`-prefixed
name. `COPY` preserves type and **leaves the source untouched** (safe rollback):

```
COPY alhifz:opens         prod:alhifz:opens
COPY alhifz:users         prod:alhifz:users
COPY alhifz:installs      prod:alhifz:installs
COPY alhifz:reciters      prod:alhifz:reciters
COPY alhifz:countries     prod:alhifz:countries
COPY alhifz:active:<YYYY-MM> prod:alhifz:active:<YYYY-MM>   # each live month bucket
```

(If `/api/stats` turns out never to have been deployed to Production, there is no
data to copy and the `prod:` keys simply start fresh — no harm either way.)

- **No silent migration:** nothing is copied or renamed automatically by the code.
- **Production data untouched:** COPY does not modify or delete the originals;
  they remain as an instant rollback if the promote is reverted.
- **Rollback:** reverting the deploy returns Production to the bare-key code; the
  original data is still there.

## Tests

`tests/subscribe-hardening.test.mjs` asserts Production, Preview, and test keys
differ and that a missing/invalid namespace fails closed. Existing reminder tests
(`tests/reminder-dispatch.test.mjs`) run under `VERCEL_ENV=development` and use the
same builders, so they exercise the namespaced keys end-to-end.
