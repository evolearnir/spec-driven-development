# Specification — Product Decisions and Application Foundation

| Field            | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Feature ID       | F001 / feature-20261003-113908                                                                |
| Product          | SkillMart (working title)                                                                     |
| Roadmap scope    | Phase 0 — Confirm Product Decisions; Phase 1 — Foundation, Authentication, and Access Control |
| Mission coverage | MKT-04; foundation for MKT-01 through MKT-07                                                  |
| Status           | Accepted; locally implemented and checked; final acceptance pending                           |
| Owner            | Requesting product owner (approved accountable owner for MKT-01–07)                           |
| Created          | 2026-10-03; folder timestamp uses local system time                                           |
| Branch           | `feature-20261003-113908`                                                                     |

References: [mission](../../constitution/mission.md),
[roadmap](../../constitution/roadmap.md),
[technology stack](../../constitution/tech-stack.md),
[implementation plan](implementation.md), and [validation plan](validation.md).

This package uses the product owner's requested `features/` location and filenames:
`specification.md` is the feature specification, `implementation.md` combines the
technical plan and ordered tasks, and `validation.md` holds acceptance scenarios and evidence.

## Problem and Outcome

The marketplace has a mission and proposed roadmap but no application foundation.
Resolve product decisions and establish a reproducible Express/EJS/SQLite application
with working account access before implementing discovery and marketplace panels.

Target users are the product owner defining the MVP, developers setting up the
application, visitors registering accounts, returning users, and the initial admin.

## Scope

Phase 0 covers MVP review, publication/ownership/deletion rules, initial taxonomy,
licensing, retention, budget, ownership, and architecture decisions.

Phase 1 covers application setup, shared EJS/CSS foundations, schema/migrations,
registration, login/logout, email verification, password recovery, persistent sessions,
authorization policies, first-admin bootstrap, configuration, staging readiness,
linting/formatting, and repeatable manual checks.

Full landing/catalog/detail pages, creator CRUD screens, admin CRUD screens,
invitation acceptance UI, payments, uploads, and automated test tooling belong to
later work. Foundation policy checks must be verifiable independently of those screens.

## Requirements and Acceptance Criteria

| ID       | Requirement                                                       | Observable acceptance criteria                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F001-R01 | Confirm the MVP and governing decisions.                          | Record owner decisions for all seven MVP capabilities, skill format, free sharing, publication, taxonomy/licenses, deletion/reassignment, suspension, retention, and budget. No Phase 0 blocking question remains unresolved at its exit.                                                                                        |
| F001-R02 | Record ownership, feature boundaries, and architecture decisions. | Assign an owner and acceptance boundaries to each MVP capability; link ADRs for Express/EJS, SQLite, authentication, and deployment constraints; record specification and plan approval before implementation.                                                                                                                   |
| F001-R03 | Provide a reproducible application setup.                         | A fresh checkout on documented Node.js 24 prerequisites can install dependencies, configure its environment, migrate SQLite, and run development/production start commands. Missing required configuration fails with an actionable message that contains no secrets.                                                            |
| F001-R04 | Provide shared server-rendered UI foundations.                    | Authentication screens use shared EJS partials, responsive CSS, escaped user content, labels, keyboard access, visible focus, validation feedback, and generic error pages. UI work uses `ui-ux-pro-max`.                                                                                                                        |
| F001-R05 | Establish persistent relational data and migrations.              | Schema supports users, sessions, auth tokens, skills, categories, tags, supported tools, links, audit events, and migration history. Foreign keys and uniqueness are enforced; rerunning migrations does not duplicate tables or lose data.                                                                                      |
| F001-R06 | Register regular users.                                           | Valid registration stores a normalized unique email and Argon2id password hash, creates an active unverified regular user, and initiates email verification. Invalid/duplicate input produces defined feedback; submitted role/status fields cannot grant privileges.                                                            |
| F001-R07 | Verify email ownership.                                           | A valid unexpired single-use verification token verifies the intended account. Invalid, expired, or reused tokens fail without changing verification state. A delivery failure provides a retry/resend path without duplicate accounts or false success.                                                                         |
| F001-R08 | Authenticate using persistent sessions.                           | Valid credentials for an active account create a regenerated session; invalid credentials and invited/suspended accounts do not. Session persistence survives an app restart until expiry. POST logout destroys access; reusing the old cookie cannot authenticate.                                                              |
| F001-R09 | Recover account access.                                           | Recovery requests return a consistent public response for existing and unknown emails. Valid reset tokens set a new hashed password once, invalidate outstanding reset tokens and existing sessions, and never log credentials/tokens. Invalid or expired tokens do not change passwords.                                        |
| F001-R10 | Enforce trusted authorization policies.                           | Anonymous requests cannot access protected resources, regular users cannot perform admin operations, private skill access requires owner/admin, and publication requires an active verified user with owner/admin permission. Current database role/status is checked rather than trusting client input or stale session fields. |
| F001-R11 | Respect account state changes.                                    | A session whose account becomes suspended/deleted is denied on its next protected request. Role changes affect the next request. Shared last-admin policy refuses deletion, suspension, or demotion of the final active admin inside a serialized write transaction.                                                             |
| F001-R12 | Bootstrap the first administrator.                                | An environment-guarded server-side script creates or promotes the explicitly configured account, records the action, and establishes a documented verified-account path. Rerunning it does not create duplicates or reset passwords; no public bootstrap endpoint exists.                                                        |
| F001-R13 | Protect form and authentication boundaries.                       | Mutation forms require valid CSRF tokens; failed checks make no changes. Auth endpoints enforce documented throttling. Session cookies are HttpOnly, SameSite-protected, and Secure on HTTPS staging; GET routes do not mutate data.                                                                                             |
| F001-R14 | Establish operational and code-quality readiness.                 | Lint/format checks pass; environment examples contain no secrets; staging uses a separate persistent SQLite file and SMTP configuration; health/error handling and graceful shutdown work; logs redact sensitive content.                                                                                                        |

## User Scenarios

1. The owner reviews proposed marketplace rules and records decisions before application work begins.
2. A developer follows setup documentation and runs a fresh database without undocumented steps.
3. A visitor registers, verifies their email, logs in, reloads/restarts the app, and logs out.
4. A user forgets their password and resets it; their previous sessions stop working.
5. An attacker submits an admin role, tampers with an owner ID, or omits a CSRF token; access is denied.
6. A logged-in account is suspended or demoted; the next protected request uses its current permissions.
7. A maintainer bootstraps the first admin twice without duplicate accounts or password replacement.
8. SMTP is unavailable or a token has expired; users receive defined recovery feedback rather than false success.

## Data and Non-Functional Constraints

- Use strict TypeScript/Express 5/EJS/Prisma/SQLite from constitution 0.5.0; provider selection remains open.
- Use Prisma Client, Prisma Migrate, parameterized raw SQL where necessary, transactions, foreign keys, WAL mode, and bounded busy timeouts.
- Type-check and build server/browser code; legacy baseline adoption must preserve existing users, skills, tokens, audit history, and sessions.
- Only public assets are served statically; database files and environment files are private.
- Store verification/reset/invitation token hashes, not plaintext tokens. Passwords and tokens
  must not appear in logs, audit events, screenshots, or validation evidence.
- Do not expose email addresses in public creator data. Do not execute skill instructions.
- Shared authorization must support future CRUD without implementing later-phase panels here.
- Apply WCAG 2.2 AA requirements in scope to authentication and shared UI; record manual checks.
- Password length, token/session lifetimes, request limits, and throttling values must be
  explicitly decided and documented before the corresponding implementation task.

## Phase 0 Decision Register

| Decision                            | Current position                                                                                                   | Resolution needed                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Stack and UI guidance               | Approved strict TypeScript/Express/EJS/Prisma/SQLite; Prisma-backed sessions; compatible packages pinned           | Resolved; ADR 005 and lockfile           |
| Skill format and commercial model   | Approved free Markdown sharing with all mission publication metadata                                               | Resolved; ADR 001                        |
| Publication                         | Approved immediate verified publication and admin unpublication                                                    | Resolved; ADR 001                        |
| Taxonomy and licenses               | Development/Writing/Research/Productivity/Design; Claude/ChatGPT/Gemini/Other; MIT/Apache-2.0/CC-BY-4.0/CC0-1.0    | Resolved; ADR 001                        |
| Ownership/deletion/suspension       | Approved explicit delete/reassign and hiding on suspension; reassignment returns skills to drafts for review       | Resolved; ADR 001 and lifecycle services |
| Retention                           | Daily cleanup; consumed tokens/backups at most 7 days; audit 90 days; immediate private-data deletion              | Resolved; ADR 002                        |
| Authentication policy               | Password 12–128; session 7d; verification 24h/reset 1h; auth 10/15m/IP; recovery/resend 3/h/IP; attested bootstrap | Resolved; ADR 003                        |
| Product owner and capability owners | Requesting product owner approved accountability for MKT-01–07 and mission capability boundaries                   | Resolved; explicit approval 2026-10-03   |
| Hosting/staging and budget          | Owner instructed “do not consider hosting for now”                                                                 | Explicitly deferred; ADR 004             |

## Completion and Approval

### Owner-requested stack replanning — 2026-10-03

The owner's direct instruction approves strict TypeScript and Prisma ORM as the
new technical baseline (constitution 0.5.0 / ADR 005). R03/R05/R14 now require
typed builds, Prisma schema/client/migrations, and non-destructive legacy adoption.
The accepted user-facing authentication and authorization criteria still apply;
earlier JavaScript evidence is historical and must be supplemented by migration checks.

### Owner-requested development email change — 2026-10-03

For NODE_ENV=development, verification and resend skip SMTP and print the raw
verification token (code) and confirmation URL in the local terminal. Accounts
remain unverified until the existing CSRF-protected confirmation POST succeeds.
Production/test verification and all password recovery continue using SMTP and
never log tokens. This owner-requested development-only exception amends R07/R14
and the token-log restriction above; tokens remain hashed in database/session
storage and are not recorded in acceptance evidence. Approved by the requesting
owner's direct change instruction before implementing the amendment.

### Recorded decisions — 2026-10-03

The requesting owner explicitly approved the specification/plan, the mission's
product rules and required metadata, free sharing, immediate verified publication,
deletion/reassignment and suspension behavior, and ownership of MKT-01–07.
The capability rows in the mission define each owner's acceptance boundary.
Approved taxonomy, licensing, exact authentication limits, retention, and bootstrap
policy are recorded in [ADR 001](../../docs/decisions/001-foundation.md),
[ADR 002](../../docs/decisions/002-persistence.md), and
[ADR 003](../../docs/decisions/003-authentication.md).
These resolutions close the blocking decisions in the register above.
The owner instructed “do not consider hosting for now”; hosting/budget/staging
execution are deferred as recorded in [ADR 004](../../docs/decisions/004-hosting.md).
This explicitly amends R01/R14 and T12 to allow local implementation without
provider/budget selection; staging and release acceptance remain pending.

Phase 0 is complete when R01–R02 have evidence and all blocking product decisions
are resolved. Phase 1 is complete when R03–R14 have passing evidence, approved
setup/operations guidance, and owner acceptance. Record separate phase decisions
so a combined feature package does not bypass the Phase 0 dependency.

| Gate                                      | Decision                                | Owner / date                          |
| ----------------------------------------- | --------------------------------------- | ------------------------------------- |
| Phase 0 exit                              | Accepted with explicit hosting deferral | Requesting product owner / 2026-10-03 |
| Specification and implementation approval | Accepted with explicit hosting deferral | Requesting product owner / 2026-10-03 |
| Phase 1 acceptance                        | Pending                                 | Not recorded                          |

Phase 0 is accepted. Phase 1 code is implemented and locally checked; final owner
acceptance and deferred environment verification are not claimed.
