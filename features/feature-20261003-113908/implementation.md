# Implementation Plan — Phases 0 and 1

Feature: `feature-20261003-113908` / F001.
Status: TypeScript/Prisma replanning implemented and locally checked 2026-10-03; earlier JavaScript evidence retained. Hosting/staging execution deferred by owner.
Requirements: [specification.md](specification.md).
Evidence: [validation.md](validation.md).

## Phase 0 — Resolve and Record Decisions

1. Review the specification decision register with the product owner.
2. Record chosen values, accountable owners, and acceptance boundaries for MKT-01–07.
3. Update constitution proposals when accepted decisions change them.
4. Record ADRs in `docs/decisions/` covering server-rendered Express/EJS architecture,
   SQLite persistence, session/password/token design, and hosting constraints.
5. Record Phase 0 completion and specification/plan approval before coding.

The owner's requested `features/<feature-name>/` package replaces the generic
`specs/NNN-feature-name/` convention for this feature. Keep requirement-to-task-to-check
traceability in these three files; no separate task file is required for this package.

## Application Design

- Use strict TypeScript Express routers, thin controllers, business-rule services,
  and typed Prisma repositories; EJS templates render results and form errors.
- Configure environment validation, public static assets, body-size limits, Helmet,
  persistent sessions, current-user loading, CSRF, auth throttling, routers, then
  not-found/error handling in an explicitly documented middleware order.
- Return safe validation errors and use Post/Redirect/Get after successful mutations.
- Load `ui-ux-pro-max` before implementing auth UI and shared EJS/CSS patterns.
- Provide protected dashboard/admin foundation pages, not later-phase CRUD screens.
  Verify ownership/publication/last-admin services using development fixtures and
  documented local service calls; do not expose temporary production probe routes.

## Persistence and Authentication Design

- Configure Prisma Client over SQLite with foreign keys, WAL, and busy timeout.
  Use Prisma schema and Prisma Migrate history; baseline recognized legacy files
  without resetting data. Retain SQLite CHECK constraints in migration SQL.
- Create tables listed in the stack, CHECK constraints for roles/statuses, unique
  normalized emails/slugs, foreign keys, and lookup indexes. Keep skill draft content
  constraints separate from required publication validation.
- Persist express-session payloads through Prisma's Session model; preserve the
  existing sid/expired/sess layout and expire rows on read/startup/daily cleanup.
- Use Argon2id for password hashes; generate random tokens using Node's crypto module
  and persist only hashes, purpose, expiry, and consumption state.
- Consume verification/reset tokens atomically. Password reset updates the hash,
  consumes/invalidates reset tokens, and revokes all existing sessions. Account deletion
  and status changes must also revoke access through current-user checks.
- Separate successful account creation from email delivery failure. Support verification
  resend with throttling and defined token invalidation behavior.
- Current-user middleware reloads role/status from SQLite. Services enforce ownership
  and verified-publication rules. Acquire a writer lock before reads in Prisma
  transactions for final-admin checks/lifecycle mutations and audit recording.
- The bootstrap script accepts credentials through documented protected configuration
  or an interactive prompt, not command-line password arguments; it is repeat-safe,
  records the action, and follows the approved account verification policy.

## HTTP Interface

| Route                       | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| GET/POST `/register`        | Registration form and regular-account creation.                      |
| GET/POST `/login`           | Login form and session creation.                                     |
| POST `/logout`              | Session destruction.                                                 |
| GET `/verify-email`         | Render verification confirmation or failure; no state change on GET. |
| POST `/verify-email`        | Consume verification token.                                          |
| POST `/resend-verification` | Send a new verification link under documented limits.                |
| GET/POST `/forgot-password` | Recovery request with consistent public response.                    |
| GET/POST `/reset-password`  | Reset form and atomic password replacement/token consumption.        |
| GET `/dashboard`            | Authenticated foundation page.                                       |
| GET `/admin`                | Admin-only foundation page.                                          |
| GET `/health`               | Minimal readiness response without credentials or schema details.    |

Token-bearing GET pages do not consume tokens; POST forms handle consumption with
CSRF protection. Avoid storing raw token URLs in access logs or sending them to third-party assets.
Later features add skill CRUD and administrative lifecycle routes.

## Ordered Implementation Tasks

| Task | Work                                                                                                                  | Requirements  | Validation    |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ------------- | ------------- |
| T01  | Complete decision register, capability ownership, and ADRs; record Phase 0 acceptance.                                | R01–R02       | V01–V02       |
| T02  | Scaffold npm/ES modules, Express, EJS, project folders, runtime configuration, and lockfile.                          | R03           | V03           |
| T03  | Add environment validation, `.env.example`, Git ignores, startup, and shutdown handling.                              | R03, R14      | V03, V14      |
| T04  | Implement SQLite connection, migrations, schema, guarded fixture seed, and consistent backup command.                 | R05, R14      | V05, V14      |
| T05  | Add shared auth templates/CSS, static-asset boundary, accessibility, and error pages using the UI skill.              | R04           | V04           |
| T06  | Configure persistent sessions, cookie policy, CSRF, throttling, and current-user loading.                             | R08, R10, R13 | V08, V10, V13 |
| T07  | Implement registration, validation, password hashing, verification delivery/consumption, and resend.                  | R06–R07       | V06–V07       |
| T08  | Implement login/logout, recovery requests, token consumption, and session revocation.                                 | R08–R09       | V08–V09       |
| T09  | Implement shared owner/admin/publication checks, current-status enforcement, and transactional last-admin protection. | R10–R11       | V10–V11       |
| T10  | Add repeat-safe bootstrap with audit recording and documented verification policy.                                    | R12           | V12           |
| T11  | Add lint/format scripts and document fresh setup, SMTP, staging, maintenance, and manual fixture procedures.          | R03, R14      | V03, V14      |
| T12  | Execute validation scenarios locally and in staging; record failures, fixes, evidence, and Phase 1 acceptance.        | All           | V01–V14       |

`Rxx` and `Vxx` abbreviate this feature's `F001-Rxx` and `F001-Vxx` identifiers.
T01 complete: explicit owner approval and ADRs 001–004 recorded before application coding.
T02–T11 complete: application, migrations, persistent sessions, auth flows, policies,
bootstrap/backup/cleanup, UI and operations guide are implemented in the root project.
T12 local portion complete: controlled HTTP/service checks, Chrome UI/SMTP checks,
lint and formatting; see validation evidence. Staging portion deferred by owner.
Final Phase 1 acceptance remains with the owner.

Owner-requested development follow-up: verification/resend now skip SMTP and
print the code/link only under NODE_ENV=development. Confirmation remains required;
production/test and recovery still use SMTP. Form notices and workspace actions
identify the terminal flow. This is covered by the local environment-boundary check.

## Commands and Environments

### Replanning implementation slice (constitution 0.5.0 / ADR 005)

1. Convert all authored server, browser, and script source to strict TypeScript;
   add type-check/server/client builds and generated-output ignores (R03/R14).
2. Define mapped Prisma models, adopt Prisma Client, and replace synchronous
   application queries with awaited ORM operations (R05–R12).
3. Deploy Prisma migration history on fresh files; baseline retained legacy files
   non-destructively and verify existing data/session preservation (R03/R05).
4. Replace the separate session driver with a Prisma-backed store; preserve
   transactional revocation and serialized final-admin/token checks (R07–R11).
5. Re-run disposable HTTP, independent-worker concurrency, bootstrap, retention,
   and backup-restore checks; append new evidence instead of reusing old results.

Implement `npm run dev`, `npm start`, `npm run lint`, `npm run format`,
`npm run format:check`, `npm run db:migrate`, `npm run db:seed`,
`npm run admin:bootstrap`, and `npm run db:backup` as documented in the stack.
Use `npm ci` for clean lockfile-based installation after dependencies are established.
Add `npm run db:generate`, `npm run typecheck`, `npm run build`, and
`npm run build:client`; production starts compiled `dist/src/server.js`.

Development and staging use separate SQLite files and SMTP settings. Staging needs
HTTPS, one long-running application instance, and persistent local disk; choose its
provider after the budget decision. Configure proxy trust for the actual environment.

## Verification and Rollout

Use the manual scenarios in `validation.md`; no automated test framework is planned.
Verify permissions through requests and controlled service calls as well as UI behavior.
Use temporary development accounts and never include live credentials in evidence.

Before staging rollout, run lint/format checks, back up existing data, apply migrations
through a controlled step, start the application, and verify auth/email/health behavior.
Document application rollback separately from SQLite restore. Verify backup restoration
against a separate file before relying on the procedure.

## Risks and Dependencies

- Phase 0 decisions and owner acceptance precede implementation.
- Persistent session adapter compatibility and native package installation must be
  verified against Node.js 24 on development and staging environments.
- SMTP configuration and delivery are required for verified-account acceptance.
- SQLite assumes local persistent storage and a bounded single-instance workload.
- Concurrent account changes, token consumption, and retries require transactions
  and must not leave partial accounts, reusable tokens, or invalid admin state.
