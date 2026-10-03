# SkillMart foundation

Phase 0 decisions and Phase 1 local foundation for
`features/feature-20261003-113908`. Node.js 24, Express 5, EJS, SQLite.
Hosting is deferred by the owner. See [recorded decisions](docs/decisions/001-foundation.md)
and [validation evidence](features/feature-20261003-113908/validation.md).

## Fresh setup

1. Install Node.js **24.x** with npm. Native drivers have Windows x64 prebuilt
   binaries; unsupported platforms need their native build prerequisites.
2. Run `npm ci` in the repository root.
3. Copy `.env.example` to private `.env` with your editor. Generate a session
   secret using the command in that example; put it only in private configuration.
4. Set `APP_URL` to the browser-reachable origin, `DATABASE_PATH` to your local
   database file, and SMTP settings to your mail service or a local SMTP inbox
   (for example Mailpit on port 1025). Email links always use configured `APP_URL`.
5. Run `npm run db:migrate`, then `npm run dev` (reload) or `npm start`.
6. Open `http://localhost:3000/register`. Register, open the verification link
   printed in the development terminal (or emailed outside development), confirm
   the form, and sign in. `/dashboard` is the protected workspace;
   `/admin` is an admin-only foundation page. `/health` is minimal readiness.

The app deliberately fails on missing configuration or an unmigrated database.
In development (`NODE_ENV=development`), verification emails are **not sent**:
registration/resend prints the verification code (token) and confirmation link
in the server terminal. Open that link and confirm the form to verify your account.
The workspace's **Print verification code** button generates another link.
Production/test verification and password recovery still use SMTP. SMTP settings
remain configured for password recovery even when development verification skips it.

SMTP connectivity is checked on delivery, so a temporary outage does not undo
account creation. Sign in and resend from the workspace after fixing delivery.
New verification links invalidate older links. Recovery always gives the same
public response for known and unknown accounts.

## Commands

| Command                                   | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `npm ci`                                  | Reproduce pinned dependencies                                 |
| `npm run dev` / `npm start`               | Reloading / normal HTTP server                                |
| `npm run db:migrate`                      | Apply numbered SQL migrations atomically, repeat-safe         |
| `npm run db:seed`                         | Guarded development fixtures, repeat-safe                     |
| `npm run admin:bootstrap`                 | Protected administrator setup                                 |
| `npm run db:backup`                       | Consistent live SQLite backup                                 |
| `npm run db:cleanup`                      | Daily token/session/audit/backup retention                    |
| `npm run lint`                            | ESLint                                                        |
| `npm run format` / `npm run format:check` | Prettier-supported source/docs/styles; EJS reviewed manually  |
| `npm run check:local`                     | Controlled disposable HTTP/service/concurrency/restore checks |

There is no automated test framework. `check:local` uses Node assertions, real
HTTP requests, ephemeral fixtures, and independent SQLite connections. It needs
no `.env`, SMTP account, or production database, creates files under the OS temp
directory, removes them afterward, and never prints credentials/tokens.

## Administrator bootstrap

In protected `.env` or an operator-only environment, set `BOOTSTRAP_ENABLED=true`,
`BOOTSTRAP_EMAIL`, `BOOTSTRAP_NAME`, and `BOOTSTRAP_PASSWORD` (12–128 characters).
Set `BOOTSTRAP_EMAIL_VERIFIED=true` only after independently establishing ownership
of that mailbox. Run `npm run admin:bootstrap`, then remove the bootstrap values.
Do not pass passwords as command-line arguments or commit the private environment.

Existing active accounts are promoted and marked verified by this explicit
attestation. Their password is never changed. Already-verified admins are no-ops;
each actual bootstrap action is audited. Invited/suspended accounts are refused.
There is no HTTP bootstrap endpoint.

## Architecture and boundaries

`src/app.js` documents middleware order in executable form: environment is validated
before app construction; Helmet, public static boundary, bounded form parser,
minimal readiness, persistent sessions, fresh current-user lookup, CSRF, shared
view state, throttled auth routes, protected pages, 404, central errors.
Successful form mutations use 303 redirects. Token GETs render forms without
changing account/token state; only token hashes are retained in the server
session for POST consumption and raw tokens are not echoed into HTML. Browser pages are
`no-store` and `no-referrer`, with no third-party assets.

`connect-sqlite3` owns `sessions(sid, expired, sess)` in the same database as
application tables. Its separate sqlite3 connection has WAL/foreign keys/busy
timeout. It expires sessions on read and cleans them at startup/daily; close the
connection after HTTP requests drain. Application transactions delete sessions
on reset/lifecycle changes. An `auth_version` counter also rejects stale sessions
that a competing request might otherwise resave. Account role/status comes from
SQLite each time, never from submitted form roles or cached session permissions.

`src/services/policies.js` exposes `readSkill`, `assertOwner`, `assertPublish`,
`admin`, and `changeAccount`. Pass actor IDs from trusted authenticated context;
these services independently reload the actor. Publication checks all required
metadata, approved licenses, tool associations, and both actor/owner verification.
Lifecycle writes use immediate transactions with audit events and final-admin
protection. Explicit deletion/reassignment is mandatory; reassigned skills become
drafts for the new owner to review. These are foundation services for future CRUD.

Only `public/` is served under `/assets`. Templates escape user content. Central
logs record event/status/purpose only, without URLs, emails, bodies, credentials,
or raw errors, except owner-approved development verification code/link output.
Configure future proxy access logs to omit query strings entirely;
verification/reset links must never be copied into logs or third-party analytics.

## Local fixture and policy procedures

Set `NODE_ENV=development`, `SEED_ENABLED=true`, and a disposable `DATABASE_PATH`
in private `.env`. Migrate and run `npm run db:seed`. Fixtures A–F use addresses
`a@fixtures.example.test` through `f@fixtures.example.test`: A is unverified,
B verified, C suspended, D invited, E/F verified admins. A/B have draft/published
skills. Fixture passwords are random and intentionally unavailable; create your
own browser accounts or bootstrap an explicit operator account.

Example private-skill service check, from the repository root:

```sh
node --input-type=module -e "import {loadConfig} from './src/config/env.js'; import {openDatabase} from './src/db/connection.js'; import {accounts} from './src/repositories/accounts.js'; import {policies} from './src/services/policies.js'; const db=openDatabase(loadConfig().DATABASE_PATH); const a=accounts(db).byEmail('a@fixtures.example.test'); const s=db.prepare('SELECT id FROM skills WHERE slug=?').get('fixture-a-draft'); console.log(policies(db).readSkill(s.id,a.id).status); db.close();"
```

Use `npm run check:local` for repeatable denied-owner, unverified-publication,
role/status changes, deletion/reassignment, token expiry/reuse, and separate-worker
last-admin races. No temporary policy-probe HTTP endpoints exist.

## Policy values and maintenance

- Passwords: 12–128 characters, Argon2id (64 MiB, 3 passes, parallelism 1).
- Session access: fixed 7 days after login; HttpOnly, SameSite=Lax, HTTPS Secure.
- Verification: 24 hours, reset: 1 hour, random 32-byte tokens hashed at rest.
- Auth mutations: shared 10 attempts/15 minutes/IP; recovery/resend: shared
  3/hour/IP. In-memory counters reset on restart; do not run multiple processes.
- Run backup and cleanup daily using an operator scheduler. Tokens expire on use
  even before cleanup. Cleanup removes expired sessions/tokens, consumed tokens
  older than 7 days, audit events older than 90 days, named backups older than
  7 days. Off-host copies must follow the same retention.
- Deletion removes the user and private tokens/sessions immediately, nulls old
  audit actor references, and explicitly deletes/reassigns skills transactionally.
  Audit summaries contain no names/emails; retained backups age out within 7 days.

`npm run db:backup` uses SQLite's backup API, including committed WAL data.
To verify restoration, open the resulting backup as a **separate** database, run
`PRAGMA integrity_check` and inspect known account/migration counts. The local
checks demonstrate this procedure. Never restore over a running database.

For recovery: stop the app, preserve the current database/WAL/SHM for diagnosis,
restore the selected consistent backup to a separate new path, check integrity,
set `DATABASE_PATH` to that path, then restart. Application rollback is separate:
restore a compatible source/lockfile release and run `npm ci`; do not blindly
reverse migrations or overwrite live data. Back up before every migration.

## Future staging readiness

Hosting/provider/budget and actual staging execution are deferred by owner request.
When resumed, use a separate absolute database path outside releases, separate
SMTP configuration, HTTPS, one process, and persistent local disk. Set
`NODE_ENV=production`, HTTPS `APP_URL`, and `TRUST_PROXY` to the actual number of
trusted proxy hops (0 for direct connections). Do not expose the app directly when
trusting forwarded headers. Use persistent local storage, not network WAL sharing.

Start after controlled migrations, verify health/email/cookies and the auth journey,
and rerun environment-dependent acceptance checks. SIGINT/SIGTERM drain requests,
close email/session/database resources, and force termination after 10 seconds if
draining stalls. Unix graceful-signal behavior needs verification on that environment;
Windows process termination and real server startup have been checked locally.
