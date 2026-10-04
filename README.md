# SkillMart

SDD replanning baseline: **strict TypeScript, Node.js 24, Express 5, EJS, Prisma
ORM, and SQLite**. See [constitution](constitution/mission.md),
[tech stack](constitution/tech-stack.md), [ADR 005](docs/decisions/005-typescript-prisma.md),
and [F001 evidence](features/feature-20261003-113908/validation.md).
Public discovery, SEO and Light/Dark/System themes are implemented in
[F002](features/feature-20261004-122329/specification.md). Hosting/staging is deferred;
creator and administrator CRUD screens remain later roadmap work.

## Fresh setup

1. Install Node.js **24.x** and npm. SQLite's backup utility uses a native driver
   with Windows x64 prebuilt binaries; other platforms may need build prerequisites.
2. Run `npm ci`. Postinstall generates Prisma Client from `prisma/schema.prisma`.
3. Copy `.env.example` to private `.env` with your editor. Generate a session secret
   using the example command; configure `APP_URL`, `DATABASE_PATH`, and SMTP.
4. Run `npm run db:migrate`, then `npm run dev`.
5. For compiled execution, run `npm run build` then `npm start`.
6. Open `http://localhost:3000/register`. Register, open the verification link,
   confirm the form, and sign in. `/dashboard` is the protected workspace;
   `/admin` is an admin-only foundation page; `/health` checks database access.

Run commands from the repository root. Templates remain in `src/views/`, server
output goes to `dist/`, and browser TypeScript in `src/client/` compiles to
`dist/client/`, served at `/assets/js/`. Generated output is ignored. `dev` builds browser code on startup;
run `npm run build:client` after editing browser modules.

Development verification/resend skips SMTP and prints the code/link to the local
terminal. Confirmation is still required. Production/test verification and all
password recovery use SMTP and never log raw tokens. Delivery failure preserves
the account so the user can sign in and resend. New verification links invalidate
older ones; recovery responses are consistent for known/unknown accounts.

## Commands

| Command                                   | Purpose                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `npm ci`                                  | Reproduce pinned dependencies and generate Prisma Client                      |
| `npm run dev`                             | Run TypeScript with tsx watch                                                 |
| `npm run typecheck`                       | Strict checks across server, browser, and maintenance scripts                 |
| `npm run build`                           | Compile production server/scripts and browser code                            |
| `npm start`                               | Run compiled `dist/src/server.js`                                             |
| `npm run build:client`                    | Rebuild browser JavaScript                                                    |
| `npm run db:generate`                     | Regenerate Prisma Client after schema edits                                   |
| `npm run db:migrate`                      | Baseline recognized legacy files, then Prisma migrate deploy                  |
| `npm run db:seed`                         | Guarded repeat-safe development fixtures                                      |
| `npm run admin:bootstrap`                 | Protected administrator setup                                                 |
| `npm run db:backup`                       | Consistent live SQLite online backup                                          |
| `npm run db:cleanup`                      | Daily token/session/audit/backup retention                                    |
| `npm run lint`                            | ESLint with TypeScript rules                                                  |
| `npm run format` / `npm run format:check` | Prettier; EJS reviewed manually                                               |
| `npm run check:local`                     | Disposable HTTP/service/concurrency/migration/restore checks; run build first |
| `npm run check:marketplace`               | Disposable catalog/query/Markdown/SEO/visibility/seed checks                  |

Local checks use Node assertions, real HTTP, independent worker connections, and
OS-temp files removed afterward. No test framework, SMTP account, live database,
or real credentials are needed. HTTPS cookie checks use proxy simulation; actual
browser accessibility/SMTP/HTTPS staging checks remain environment-specific.

## Prisma schema and retained databases

`DATABASE_PATH` is the application's database setting. Runtime and migration
wrappers derive an absolute `file:` Prisma URL from it, so existing `.env` files
remain usable. A direct Prisma CLI command needs `DATABASE_URL` set explicitly
to the same database's absolute `file:` URL (forward slashes on Windows).

The schema uses existing SQL table/column names, relations, indexes, and BigInt
millisecond timestamps. Use generated Prisma queries for application data and await
them. Parameterized raw SQL is limited to SQLite pragmas, writer locking, and JSON
session revocation, and literal catalog matching/case-insensitive title ordering.
`better-sqlite3` is only used for legacy inspection and backup.

**Back up a retained database before migration.** `db:migrate` recognizes the old
`schema_migrations` entry `001-foundation.sql`, baselines the existing foundation
with Prisma, and deploys subsequent migrations without replaying table creation.
It preserves users, skills, tokens, audits, and sessions; unrecognized existing
files are refused. Fresh databases deploy the same checked-in foundation migration.
Old migration history remains; Prisma owns new history in `_prisma_migrations`.

Author future changes with Prisma Migrate against a disposable development file,
review the SQL, then commit the schema and migration together. SQLite CHECK
constraints are defined in migration SQL and must be retained when rebuilding
tables. Do not use `db push` or `migrate reset` on retained data.

## Architecture and authorization

`src/app.ts` wires Helmet, the public-only static boundary, bounded form parsing,
readiness, Prisma-backed sessions, fresh current-user lookup, CSRF, view state,
throttled auth routes, protected pages, 404, and central errors. Successful mutations
use 303 redirects. Token GETs only render forms; server sessions retain token hashes
for POST consumption. Pages use no-store/no-referrer and no third-party assets.

The Prisma session store uses the compatible `sessions(sid, expired, sess)` layout.
Rows expire on read/startup/daily cleanup. Reset and lifecycle transactions revoke
sessions; the `auth_version` counter rejects a stale session that a competing
request might resave. Current database role/status applies on each protected request.

`src/services/policies.ts` exposes async `readSkill`, `assertOwner`, `assertPublish`,
`admin`, and `changeAccount`. Pass trusted actor IDs and await results. Publication
requires complete metadata, an allowed license, tools, and verified active actor/owner.
Lifecycle transactions acquire SQLite's writer lock **before** policy reads and
include audit writes, preserving the last active admin under concurrent requests.
User deletion requires explicit skill deletion/reassignment; reassigned skills
become drafts. Source, `.env`, and database files are never served statically.

## Administrator bootstrap and fixtures

In protected `.env` or operator configuration, set `BOOTSTRAP_ENABLED=true`,
`BOOTSTRAP_EMAIL`, `BOOTSTRAP_NAME`, and `BOOTSTRAP_PASSWORD` (12–128 characters).
Set `BOOTSTRAP_EMAIL_VERIFIED=true` after establishing mailbox ownership. Run
`npm run admin:bootstrap`, then remove bootstrap values. No public bootstrap route
exists. Existing active accounts are promoted/verified without resetting passwords;
repeat runs are no-ops and actual changes are audited. Invited/suspended accounts
are refused.

For fixtures, set `NODE_ENV=development`, `SEED_ENABLED=true`, and a disposable
`DATABASE_PATH`; migrate and run `npm run db:seed`. A–F use addresses
`a@fixtures.example.test` through `f@fixtures.example.test`: A unverified, B verified,
C suspended, D invited, E/F verified admins. A/B have draft/published skills. Random
fixture passwords are intentionally unavailable; create a browser account or bootstrap
an explicit operator. `check:local` demonstrates awaited Prisma/policy calls.

## Public marketplace and themes

To populate the configured development database with 100 published demo skills
(20 per category), run `$env:SEED_ENABLED = 'true'; npm run db:seed:demo` in
PowerShell. This owner-requested demo seed uses complete Markdown/metadata,
all four tools and allowed licenses, and five verified demo creators. Stable
`demo-001-…` through `demo-100-…` slugs preserve existing records and operator edits
on reruns. Production configuration is refused. This command adds demo inventory
without adding the private/authentication acceptance fixtures from `db:seed`.

Open `/` for featured/latest skills, `/skills` for discovery, and `/skills/:slug`
for details, safe Markdown and copying. Only published skills with active owners
are visible, including to signed-in owners/admins on public routes. The interim
Publish CTA goes to login/workspace and explains that editing arrives in Phase 3.

The catalog accepts `q`, `category`, `tag`, `tool`, `sort` and `page`, in that URL
order. Search trims input (100 characters max) and literally matches title, summary
or tags; `%`/`_` are not wildcards. SQLite LOWER supplies ASCII case-insensitive
matching and title sorting; date/title ties use ID ascending. Filters combine with
AND, page size is 12, and pages are capped at 10000. Defaults/blank values and
unknown tracking keys redirect to normalized URLs. Invalid recognized input gives
400; out-of-range result pages give 404. Filter forms reset pagination.

Public HTML includes titles/descriptions, APP_URL-based canonicals and OG/Twitter
cards. Unfiltered browse pages are indexable with page-specific canonicals; search,
filters and nondefault sort use normalized self canonicals with noindex. Auth,
protected and error pages have noindex and omit canonical/sharing URLs. Dynamic
`/sitemap.xml` contains only `/`, `/skills` and eligible details with actual lastmod;
`/robots.txt` references it. Catalog query URLs remain crawlable to observe noindex.

The shared theme selector defaults to System. Light/Dark selections persist in
`skillmart.theme`; System removes the override and follows OS changes. Blocked
storage permits an in-document choice. A same-origin classic script resolves the
theme before CSS loads under the existing CSP; no-JS uses the CSS system fallback.
Copy reports success only after a completed clipboard write. Raw instructions
remain selectable with no JavaScript or clipboard access.

Development seeding adds 30 realistic skills, three active creators, title/date tie
fixtures, a Markdown safety fixture, and draft/suspended/invited-owner fixtures.
Reruns preserve edits and unrelated data. Use only disposable development databases:

```powershell
$env:NODE_ENV = 'development'
$env:SEED_ENABLED = 'true'
$env:DATABASE_PATH = Join-Path $env:TEMP 'skillmart-demo.sqlite'
npm run db:migrate
npm run db:seed
npm run dev
```

Other required configuration remains in `.env`/environment. Never point these
fixture commands at retained production data. `check:marketplace` manages its own
disposable database, including seed refusal, query/visibility and HTTP checks.

## Maintenance and operations

- Passwords: Argon2id, 64 MiB, 3 passes, parallelism 1; 12–128 characters.
- Sessions: fixed 7-day access after login; HttpOnly, SameSite=Lax, HTTPS Secure.
- Tokens: random 32 bytes, hashed at rest; verification 24 hours, reset 1 hour.
- Auth limit: shared 10 attempts/15 minutes/IP; recovery/resend: shared 3/hour/IP.
  In-memory limits reset on restart; deployment is one application process.
- Schedule backup/cleanup daily. Remove expired tokens/sessions, consumed tokens
  older than 7 days, audits older than 90 days, and named backups older than 7 days.
  Apply the same retention to off-host backups.
- Deletion removes private tokens/sessions and nulls historical audit actor links;
  non-sensitive audit summaries contain no names/emails/credentials.
- Logs omit raw errors, URLs, bodies, credentials, and tokens, except the approved
  development verification output. Proxy logs must omit sensitive query strings.

Backup uses SQLite's online backup API, including committed WAL data. Verify a
backup as a separate file with `PRAGMA integrity_check` and known account/migration
counts. Never restore over a running database. Stop the app, preserve the current
database/WAL/SHM, restore to a new path, check integrity, update `DATABASE_PATH`,
and restart. Application rollback means restoring a compatible source/lockfile,
running `npm ci` and `npm run build`; database recovery is separate.

Future staging requires HTTPS, isolated SMTP/database configuration, one process,
and persistent local disk outside release directories. Configure `TRUST_PROXY`
to the actual proxy arrangement. Migrate before starting a release. SIGINT/SIGTERM
drains HTTP requests and disconnects Prisma/mail resources; forced termination
occurs after 10 seconds. Unix graceful signal behavior is checked on that environment;
Windows process termination is used locally.
