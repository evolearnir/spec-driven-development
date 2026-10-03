# AI Skill Market Roadmap

Status: Phase 1 TypeScript/Prisma replanning implemented and locally checked; prior foundation evidence retained; final acceptance pending; hosting/staging deferred per ADR 004.
Governed by: [Mission and Constitution](mission.md), version 0.6.0.
Technical baseline: [Technology Stack](tech-stack.md).

## Delivery Strategy

Build a free skill-sharing MVP in dependency order: foundation, discovery,
creator management, administration, and launch validation. Each milestone produces
a usable increment with observable acceptance criteria. Dates are set after team
capacity and accepted specifications are known; phases are not calendar commitments.

## Phase 0 — Confirm Product Decisions

**Outcome:** An accepted MVP and implementation-ready boundaries.

- Review MKT-01 through MKT-07 in `mission.md`.
- Confirm Markdown-based skills, metadata, free sharing, and immediate publication.
- Choose initial categories, supported tool labels, and allowed licenses.
- Confirm deletion, ownership reassignment, account suspension, and retention behavior.
- Approve the recommended stack, deployment budget, and product owner.
- Define feature specifications and record significant architecture choices in ADRs.

**Exit criteria:** Product and stack proposals are accepted; blocking questions are
resolved; each MVP capability has an owner and testable acceptance criteria.

## Phase 1 — Foundation, Authentication, and Access Control

**Depends on:** Phase 0. **Scope:** Foundation and MKT-04.

- Scaffold Express.js, EJS, strict TypeScript, and shared CSS/HTML partials.
- Configure Prisma Client over SQLite, Prisma Migrate, password hashing, and Prisma-backed persistent sessions.
- Baseline existing SQLite databases without resetting data; verify fresh and legacy setups.
- Add TypeScript checking/builds for server, maintenance scripts, and browser modules.
- Model users, sessions, roles, statuses, skills, categories, tags, and audit events.
- Implement registration, email verification, login/logout, and password recovery.
- Establish server-side ownership/role checks and first-admin bootstrap.
- Set up formatting, linting, staging, manual acceptance scenarios, and example configuration.

**Exit criteria:** A fresh checkout can be configured and run with documented commands.
Authentication works in staging; unverified users cannot publish; suspended accounts
are denied protected access; protected routes and mutations reject unauthorized requests.
Database migrations and first-admin setup are repeatable. Type-checking and builds
pass; legacy adoption preserves users/sessions; concurrent Prisma transactions
preserve token single-use and final-admin protection.

## Phase 2 — Public Marketplace, SEO, and Dark Theme

**Depends on:** Phase 1. **Scope:** MKT-01, MKT-02, MKT-03; SEO-01–03 and THEME-01–02 from the mission.

- Seed realistic sample skills for development and acceptance verification.
- Build landing page messaging, featured/latest sections, and browse/publish links.
- Build skill cards, search, category/tag/tool filters, sorting, and pagination.
- Store discovery state in URL parameters for shareable results.
- Build skill details with safe Markdown rendering, creator information, license,
  declared compatibility, usage instructions, and copy feedback.
- Add loading/empty/error/not-found states.
- Implement server-rendered page-specific titles/descriptions, absolute canonical URLs,
  Open Graph/Twitter metadata, robots.txt, and an XML sitemap (SEO-01–03).
- Define canonical/indexing policy for search/filter/sort/pagination URLs; exclude
  private, token-bearing, unavailable, and error pages from indexing and the sitemap.
  Publication changes and owner suspension must update sitemap eligibility.
- Build shared light/dark CSS tokens and an accessible Light/Dark/System selector;
  default to the system preference and persist explicit choices (THEME-01–02).
- Apply both themes to public pages, existing auth and protected-page shells,
  Markdown/code, forms, focus states, and empty/error states. Resolve the initial
  theme before paint and keep content readable without JavaScript or storage.
- Record metadata/crawler checks and browser checks for both themes, preference
  persistence, system changes, keyboard access, responsive layouts, and contrast.

**Exit criteria:** A visitor can navigate from the landing page to a filtered list,
open a skill, and copy its instructions. Only published skills from active owners
appear publicly. Draft and deleted skill URLs disclose no private content.
Search/filter combinations, pagination, and invalid URLs have defined behavior.
SEO-01–03 and THEME-01–02 pass: metadata/main content appears in initial HTML;
canonical/query policies are verified; sitemap and noindex rules respect public
visibility; theme selection survives reload/navigation, follows system mode, and
renders without a wrong-theme flash. Both themes meet scoped accessibility checks.

## Phase 3 — Creator Panel and Skill CRUD

**Depends on:** Phase 2. **Scope:** MKT-05.

- Build dashboard skill list with status filters and owned-skill detail views.
- Build create/edit forms with server validation and Markdown preview.
- Support draft saving, publishing, unpublishing, and confirmed deletion.
- Validate unique slugs, required publication metadata, and external links.
- Ensure subsequent public requests reflect publication status and content changes.

**Exit criteria:** A user can create a draft, read it, edit it, publish it, locate it
publicly, unpublish it, and delete it. Invalid input gives actionable feedback.
Changing an identifier in a request cannot read or modify another user's private
skill. Public visibility updates after successful mutations without a redeployment.

## Phase 4 — Administration

**Depends on:** Phase 3. **Scope:** MKT-06, MKT-07.

### User Management

- List/search users and view account status, roles, and owned skills.
- Create invited accounts and send secure account-setup invitations.
- Update profiles and roles; suspend/reactivate accounts.
- Delete users with explicit skill deletion or ownership reassignment.
- Protect the last active admin and invalidate access after suspension/deletion.

### Global Skill Management

- List/search all skills, including drafts, with owner and status filters.
- Create a skill for an explicit owner; read and edit any skill.
- Publish/unpublish, feature/unfeature, reassign ownership, and delete skills.
- Record audit events for administrative changes and expose a read-only audit view.

**Exit criteria:** Admin user and skill CRUD work end to end. Non-admin requests
are denied server-side. Invitations do not expose passwords; destructive actions
require confirmation. Last-admin protection and deletion/reassignment transactions
are verified. Suspension hides the owner's public skills and prevents protected actions.

## Phase 5 — Verification and Release

**Depends on:** Phase 4. **Scope:** All MVP capabilities.

- Manually verify complete discovery, creator, and admin journeys and record repeatable evidence.
- Verify authorization, unsafe Markdown handling, validation, and auth throttling.
- Check responsive layouts, keyboard access, accessibility, and performance targets.
- Recheck SEO visibility/canonical/sitemap rules and light/dark/system theme behavior
  across public pages and completed creator/admin panels.
- Exercise migrations, backups/restoration, application rollback, and production email.
- Configure application error logs, health checks, and aggregate usage events.
- Publish setup guidance, creator instructions, admin guidance, and release notes.

**Exit criteria:** Type-checking, production/client builds, linting, formatting, and documented manual acceptance checks pass; no release-blocking defects remain;
mission release gates have evidence; production smoke checks pass; a rollback and
database recovery procedure are documented. Assign a 30-day metrics review owner/date.

## Phase 6 — Measure and Expand

**Depends on:** Initial release and usage evidence.

Review catalog growth, creator activity, registrations, and detail-to-copy conversion.
Prioritize improvements from user feedback. Candidate features, outside the MVP:

- Skill file/archive downloads and platform-specific installation guides.
- Version history and releases.
- Bookmarks, reviews/ratings, reporting, and moderated publication.
- Creator analytics and richer discovery/recommendations.
- Paid skills, checkout, payouts, and subscriptions after commercial rules are specified.

## Feature Backlog

| Spec                   | Capability                                 | Mission reference                 | Priority | Depends on     | Status   |
| ---------------------- | ------------------------------------------ | --------------------------------- | -------- | -------------- | -------- |
| 001-foundation-auth    | Foundation, authentication, access control | MKT-04                            | P0       | Product review | Proposed |
| 002-public-marketplace | Public discovery, SEO, and dark theme      | MKT-01–03; SEO-01–03; THEME-01–02 | P0       | 001            | Proposed |
| 003-creator-skills     | User skill CRUD and publishing             | MKT-05                            | P0       | 001, 002       | Proposed |
| 004-admin-users        | Admin user CRUD and lifecycle              | MKT-06                            | P0       | 001, 003       | Proposed |
| 005-admin-skills       | Global skill CRUD and audit view           | MKT-07                            | P0       | 003, 004       | Proposed |
| 006-release-readiness  | Quality gates, operations, and launch      | All                               | P0       | 001–005        | Proposed |

## Spec-Driven Feature Delivery Loop

For each feature, use `specs/NNN-feature-name/`:

1. **Specify:** Write `spec.md` with scenarios, numbered requirements, acceptance
   criteria, exclusions, dependencies, and edge cases.
2. **Accept:** Resolve blocking questions and record project owner approval.
3. **Plan:** Write `plan.md` with design, schema/API changes, verification, and rollout.
4. **Break down:** Write ordered `tasks.md` linked to requirement IDs.
5. **Implement:** Build against the accepted specification; update it when behavior changes.
6. **Verify:** Record checks and evidence in `verification.md`; resolve unmet criteria.
7. **Release:** Record owner acceptance, release reference, and deployment verification.

Lifecycle: `Draft -> Accepted -> In progress -> Verified -> Released`.
Review this roadmap at each milestone; explain material scope changes and keep the
mission, stack, specifications, and implementation aligned.
