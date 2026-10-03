# Validation Plan and Evidence — Phases 0 and 1

Feature: `feature-20261003-113908` / F001.
Status: Phase 0 accepted; Phase 1 local implementation checked 2026-10-03.
Hosting/staging deferred by owner; final acceptance pending.
Sources: [specification.md](specification.md), [implementation.md](implementation.md).

## Method

Perform repeatable manual checks, supported by linting/formatting and controlled
SQLite/service inspection. Use a browser, developer tools, HTTP requests, and
documented local fixture/service commands. No automated test framework is required.

Run Phase 0 document checks first. Run Phase 1 checks after implementation locally
and repeat environment-dependent checks in HTTPS staging. Capture actual results;
do not mark scenarios passed based on planned behavior.

## Prerequisites and Fixtures

- Record accepted product/auth policies, dependency versions, revision, operator,
  environment, Node.js version, timestamp, and browser used.
- Use a disposable development database and separate staging database; record
  migration state and ensure SMTP inbox access for verification/recovery messages.
- Prepare accounts: active unverified user A, active verified user B, suspended user C,
  invited user D, active admin E, and an additional admin for lifecycle checks.
- Prepare skill fixtures owned by A and B, with both draft and published states;
  these support policy validation without implementing later-phase CRUD screens.
- Document exact local fixture/service invocation commands during implementation.
  Do not add production endpoints just to expose policy checks.
- Keep real passwords, tokens, session cookies, and personal data out of evidence.

## Acceptance Scenarios (original planned baseline)

The original Not run column below is retained as the pre-implementation baseline.
The Evidence Register is the authoritative current result for each scenario.

| Check    | Requirements | Procedure                                                                                                                                                                                                       | Expected outcome                                                                                                                                     | Result  |
| -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| F001-V01 | R01          | Review the Phase 0 decision register against the mission and roadmap; inspect recorded owner decisions.                                                                                                         | Every required product decision has a chosen value, accountable owner, and approval; blocking questions are closed.                                  | Not run |
| F001-V02 | R02          | Inspect MVP capability boundaries, ADR links, feature/plan approval, and phase gates.                                                                                                                           | All seven capabilities have owners and acceptance boundaries; Phase 0 and coding approval are explicitly recorded.                                   | Not run |
| F001-V03 | R03          | Follow setup on a fresh checkout with Node.js 24; install from lockfile, configure environment, migrate, start, stop, restart; repeat with missing required configuration.                                      | Setup needs no hidden steps; documented commands work; missing config produces safe actionable errors.                                               | Not run |
| F001-V04 | R04          | Navigate auth screens at narrow/wide widths using keyboard; inspect labels, focus, validation feedback, shared partials, and escaped malicious display text; inspect UI skill usage record.                     | Forms remain usable and readable, errors are accessible, text is escaped, and shared UI follows documented skill guidance.                           | Not run |
| F001-V05 | R05          | Migrate an empty file, insert fixture records, rerun migrations, and restart; attempt duplicate emails/slugs and invalid references; inspect foreign keys/WAL; trigger a failed migration on a disposable file. | Data persists; no duplicate migration effects; constraints reject invalid data; failed migration rolls back schema/history consistently.             | Not run |
| F001-V06 | R06          | Register valid input; try invalid input, normalized-email duplicates, and forged admin/status fields; inspect stored account and password hash.                                                                 | Exactly one regular unverified active account is created; password is hashed; invalid/privilege-forging input cannot elevate access.                 | Not run |
| F001-V07 | R07          | Request verification; open link without POST, then confirm; try expired/reused/invalid tokens; simulate SMTP failure, then resend.                                                                              | GET is read-only; valid POST verifies once; invalid tokens make no changes; resend recovers from delivery failure without duplicate accounts.        | Not run |
| F001-V08 | R08          | Log in with valid/invalid credentials and invited/suspended accounts; compare session IDs before/after login; restart app; POST logout, then reuse old cookie.                                                  | Only active valid accounts authenticate; session regenerates/persists within expiry; logout makes old session unusable.                              | Not run |
| F001-V09 | R09          | Request recovery for existing/unknown emails; reset with valid token; retry/expire/tamper with token; try old password and previous sessions.                                                                   | Public responses are consistent; valid reset succeeds once; new password works; old password/sessions fail; invalid reset causes no changes.         | Not run |
| F001-V10 | R10          | Request protected foundation routes as anonymous/user/admin; invoke owner/private/publication policies on fixtures, changing user/owner IDs and verification state.                                             | Anonymous/non-admin/wrong-owner/unverified publication attempts fail; permitted owner/admin operations succeed; client-supplied roles are ignored.   | Not run |
| F001-V11 | R11          | Suspend/delete/demote a logged-in fixture account and retry requests; try removing final active admin, including competing lifecycle calls on separate connections.                                             | Current status/role applies immediately; removed/suspended accounts are denied; atomic policy leaves at least one active admin.                      | Not run |
| F001-V12 | R12          | Run first-admin bootstrap twice on a disposable database; inspect account, verification policy, audit event, and absence of public bootstrap route.                                                             | Explicit configured account becomes admin once; no duplicates/password reset on repeat; verification is documented; public bootstrap is unavailable. | Not run |
| F001-V13 | R13          | Submit mutations with missing/invalid CSRF; exceed configured auth limits; inspect HTTPS cookies; issue GET requests to mutation paths.                                                                         | Rejected requests make no changes; throttling follows recorded values; cookies have required flags; GET cannot mutate state.                         | Not run |
| F001-V14 | R14          | Run lint/format checks; inspect safe config/logs/static routes; verify separate staging data, email/health/shutdown; back up and restore into a separate file.                                                  | Checks pass; secrets/data are not exposed; staging uses persistent isolated storage; errors/shutdown are handled; restored data is intact.           | Not run |

`Rxx` abbreviates `F001-Rxx`. Add exact fixture/service commands and policy values
before executing the relevant scenario, including token/session expiries and throttle limits.

## Evidence Register — historical JavaScript revision

The results below describe the pre-Prisma foundation. References to JavaScript,
nodemon, connect-sqlite3, and the previous dependency audit are historical. Current
stack-change results are recorded in the TypeScript/Prisma section below.

Development-email amendment recheck (2026-10-03): `npm run check:local` passes
with an unavailable SMTP endpoint. Development verification returns successfully
and prints exactly the token/code and confirmation URL; production verification
and development recovery attempt SMTP and produce no token logs. Terminal output
is captured only in memory during the check, so no raw tokens enter evidence.
Lint and format checks also pass after the change. Production/test SMTP flows
and the existing verification/access-control checks continue passing.

Use one or more entries per scenario. Attach redacted screenshots, command output,
request status/response summaries, or database observations as appropriate.

| Check   | Date / operator               | Environment / revision                    | Actual result                                                                                                                                                                                                   | Evidence reference                                                                   | Defect / follow-up                                                                                    |
| ------- | ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| V01–V02 | 2026-10-03 / requesting owner | F001 session / local workspace            | Pass: explicit product/policy/ownership/specification/plan approval before coding, hosting explicitly deferred                                                                                                  | specification decision register; ADRs 001–004                                        | None for local scope                                                                                  |
| V03     | 2026-10-03 / OpenCode         | Windows / Node 24.16.0 / npm 11.13.0      | Pass locally: lockfile installation, safe missing-config exit, migrated app starts, session store reopens                                                                                                       | npm ci; scripts/check-local.js; README                                               | Staging deferred                                                                                      |
| V04     | 2026-10-03 / OpenCode         | Chrome 154.0.8037.93 / Windows            | Pass scoped local UI: 375/768/1440 layouts, labels, 44px+ inputs, keyboard skip/focus, toggle, focused errors, empty password after failure, escaped text; screenshots visually reviewed                        | docs/ui-foundation.md; temporary browser check in OS temp/opencode/skillmart-browser | Full assistive-technology audit not claimed                                                           |
| V05     | 2026-10-03 / OpenCode         | Disposable SQLite / Node 24               | Pass: repeated migrations/seed, FK/unique constraints, WAL, failed migration schema/history rollback, persistent data                                                                                           | npm run check:local                                                                  | None                                                                                                  |
| V06     | 2026-10-03 / OpenCode         | HTTP plus Chrome/local SMTP               | Pass: normalized registration, invalid/duplicate feedback, ignored forged role/status, Argon2id; browser registration                                                                                           | npm run check:local; browser check                                                   | None                                                                                                  |
| V07     | 2026-10-03 / OpenCode         | HTTP/service plus Nodemailer/local SMTP   | Pass: GET leaves verification unchanged, POST single use, expired/reused/invalid denied; delivery failure preserves account; resend replaces links                                                              | npm run check:local; browser check                                                   | External SMTP delivery deferred                                                                       |
| V08     | 2026-10-03 / OpenCode         | HTTP plus Chrome                          | Pass: active-only login, regenerated session, server/store restart persistence, logout and old-cookie denial                                                                                                    | npm run check:local; browser check                                                   | Staging deferred                                                                                      |
| V09     | 2026-10-03 / OpenCode         | HTTP/service checks                       | Pass: consistent recovery redirect, single-use/expired reset, replacement hash, old password/session denied                                                                                                     | npm run check:local                                                                  | External SMTP recovery delivery deferred                                                              |
| V10     | 2026-10-03 / OpenCode         | HTTP plus fixture services                | Pass: anonymous/non-admin denial, owner/private/publication permission checks and current trusted role                                                                                                          | npm run check:local                                                                  | None                                                                                                  |
| V11     | 2026-10-03 / OpenCode         | Separate worker-thread SQLite connections | Pass: fresh role/suspended-state checks, suspension hides public skill, deletion/reassignment, final-admin delete/suspend/demote denial; simultaneous self-demotions yield one change and one protected refusal | npm run check:local; scripts/fixtures/lifecycle-worker.js                            | None                                                                                                  |
| V12     | 2026-10-03 / OpenCode         | Disposable database                       | Pass: guarded bootstrap twice, no password overwrite/duplicate/audit duplication, attested verification, public bootstrap 404                                                                                   | npm run check:local                                                                  | None                                                                                                  |
| V13     | 2026-10-03 / OpenCode         | HTTP with HTTPS proxy-header simulation   | Pass locally: missing CSRF denied before mutation, auth throttling, GET logout 404, HttpOnly/Secure/SameSite flags in HTTPS configuration                                                                       | npm run check:local                                                                  | Real HTTPS staging deferred                                                                           |
| V14     | 2026-10-03 / OpenCode         | Local Windows / disposable backup         | Pass local checks: lint/format/audit, health/static isolation, redacted logs, consistent backup restored separately with integrity check and matching counts, retention cleanup                                 | npm run lint; npm run format:check; npm audit; npm run check:local                   | Real HTTPS/staging and Unix SIGTERM drain checks deferred; Windows forced process termination checked |

Browser-check first attempt failed in its SMTP fixture parser because Nodemailer
uses quoted-printable encoding; no application defect. The parser was corrected
to decode soft line breaks and equals signs; recheck passed. Raw mail/tokens were
kept in temporary process memory and excluded from output/screenshots.

An initial dependency audit found vulnerable transitive dependencies in the first
adapter/reloader selection. Final compatible adapter/driver/chokidar pins corrected
this; final npm audit reports zero vulnerabilities. These are resolved findings.

Exact local commands, fixture/service calls, retention/expiry/throttle values, SMTP
and restoration procedures are in README.md. Browser tooling was temporary and
not added as an application dependency or test framework. Revision: uncommitted
F001 working tree (no commit requested). No live personal data used in evidence.

Final fresh `npm ci` succeeded on Node 24.16.0, followed by passing lint,
format checks, and local checks. `npm run dev`'s exact underlying command,
`nodemon src/server.js`, was exercised with disposable configuration and returned
health 200 using the pinned chokidar override. Final Chrome/SMTP recheck passed
after replacing temporary session raw tokens with token hashes; SQLite session
inspection also confirms raw verification tokens are not persisted.

Result labels: `Not run`, `Pass`, `Fail`, `Blocked`. A failed check must link to a
defect and a later recheck; retain the original failure record.

## TypeScript/Prisma replanning evidence — 2026-10-03

Revision: uncommitted constitution 0.5.0 / ADR 005 working tree, checked by OpenCode
on Windows with Node.js 24.16.0. Verification uses disposable databases under
OS-temp/opencode and captures development token output only in memory.

| Check / requirements        | Actual result                                                                                                                                                                                                        | Evidence                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Stack alignment / R01–R03   | Pass: constitution, roadmap, tech stack, F001 constraints/plan, README, ADR 005, and npm commands use strict TypeScript and Prisma                                                                                   | Owner's direct replanning instruction; updated source/docs                   |
| Typed build / R03, R14      | Pass: strict checks across application/browser/scripts, compiled server and browser assets, TypeScript lint and formatting                                                                                           | `npm run typecheck`; `npm run build`; `npm run lint`; `npm run format:check` |
| Prisma persistence / R05    | Pass: fresh deploy and repeated deploy, WAL/FKs, unique emails/slugs and invalid-reference rejection, repeat-safe fixtures                                                                                           | `npm run check:local`; `prisma/schema.prisma`; two checked-in migrations     |
| Legacy adoption / R03, R05  | Pass: baseline and repeated deployment preserve user/password hash, session, auth token hash, skill/category, tag/tool/link relations, audit summary, and legacy history; foreign-key check returns no violations    | Disposable legacy fixture in `scripts/check-local.ts`                        |
| Authentication / R06–R09    | Pass: validation, forged-role rejection, Argon2id, read-only token GET, verification/reset reuse/expiry rejection, delivery failure/resend, recovery parity, session regeneration/restart/logout/reset revocation    | Disposable HTTP/service checks                                               |
| Policies / R10–R12          | Pass: private/owner/publication denial, current role/status, suspension/deletion access denial, explicit reassignment, rollback after denied deletion, last-admin guards, repeat-safe audited bootstrap              | Awaited Prisma policy/service checks                                         |
| Concurrent lifecycle / R11  | Pass: independent worker connections concurrently demote themselves; exactly one succeeds, one receives 409, and one active admin remains                                                                            | `scripts/fixtures/lifecycle-worker.ts`; shared worker gate                   |
| Boundaries / R13–R14        | Pass: CSRF, auth/email throttling, HTTPS cookie proxy simulation, private source/static isolation, readiness, live backup restored separately with matching user count and integrity result, expired-session cleanup | Disposable HTTP/backup/retention checks                                      |
| Compiled startup / R03, R14 | Pass: built production entry point starts; missing config exits safely; Windows process termination exercised                                                                                                        | Child-process checks of `dist/src/server.js`                                 |

Initial legacy adoption failed because Prisma decoded the old SQLite INTEGER
timestamp declaration as a 32-bit integer. The BIGINT timestamp migration rebuilds
only timestamp-bearing tables, preserves values and constraints, and fixes the
failure. The populated legacy fixture and full local acceptance suite passed on
recheck. No retained workspace database was modified by these checks.

This evidence does not re-claim the historical failed-SQL-migration scenario or
Chrome/SMTP audit for the new revision. Actual browser accessibility/interaction,
external SMTP, HTTPS staging, Unix graceful-signal handling, and owner acceptance
remain separate environment-dependent verification.

## Exit Gates

### Phase 0

- [x] V01 and V02 pass with owner approval recorded.
- [x] Blocking decisions are resolved and reflected in the constitution/ADRs.
- [x] Specification and implementation plan are accepted before application coding.

### Phase 1

- [ ] V03–V14 pass; local and staging evidence is recorded where applicable.
- [x] Lint/format checks pass and setup/maintenance guidance matches actual commands.
- [ ] No unresolved acceptance-blocking defects remain.
- [x] Foundation permissions work without claiming later-phase CRUD UI is complete.
- [ ] Owner acceptance is recorded; release reference is added if the foundation is deployed.

## Sign-Off

| Gate                            | Decision                            | Owner                    | Date       | Evidence / revision                    |
| ------------------------------- | ----------------------------------- | ------------------------ | ---------- | -------------------------------------- |
| Phase 0 accepted                | Accepted; hosting deferred          | Requesting product owner | 2026-10-03 | Explicit F001 session approvals / ADRs |
| Specification and plan accepted | Accepted; hosting deferred          | Requesting product owner | 2026-10-03 | Explicit F001 session approvals        |
| Phase 1 verified                | Local checks pass; staging deferred | OpenCode (checks only)   | 2026-10-03 | Evidence register above                |
| Phase 1 accepted / released     | Pending                             | Not recorded             | —          | —                                      |

Documentation creation is complete when these files exist and agree with the
selected roadmap phases; it is distinct from executing these application checks.
