# Mission and Constitution

Status: MVP product rules accepted by requesting product owner 2026-10-03; hosting deferred.
Constitution version: 0.4.1

## Purpose

Build a useful, maintainable product through spec-driven development (SDD): agree
on the problem and observable behavior before designing or implementing a solution.
Specifications are the source of truth for intended behavior; implementation and
verification must remain aligned with them.

## Product Mission

| Decision                       | Value                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Project name                   | SkillMart (working title)                                                                                                        |
| Target users                   | AI tool users, developers, skill creators, and marketplace administrators                                                        |
| User problem                   | Reusable AI skills are scattered across repositories and communities, making them difficult to discover, evaluate, and maintain. |
| Desired outcome                | Visitors find relevant skills; creators publish and manage their skills; administrators manage users and the entire catalog.     |
| Core value proposition         | A searchable skill catalog with clear instructions, creator ownership, and centralized administration.                           |
| MVP capabilities               | Landing page, skill list, skill detail, authentication, user skill CRUD, admin user CRUD, and admin CRUD for all skills          |
| Explicit non-goals             | Payments, running AI skills, model hosting, subscriptions, ratings, and native mobile apps                                       |
| Success metrics and targets    | Proposed launch and adoption targets below; validate during product review.                                                      |
| Project owner / decision-maker | Requesting product owner; name to be recorded before implementation approval                                                     |

> Help AI users discover and reuse practical skills, and help creators publish and
> maintain them, through an accessible marketplace with clear ownership and reliable administration.

## What Is a Skill?

A skill is a reusable instruction package for an AI assistant. In the proposed MVP,
it consists of a Markdown skill body, setup/usage instructions, descriptive metadata,
and optional source/documentation links. The marketplace stores and displays these
instructions; it does not execute them or promise compatibility with every AI tool.

Required published fields: title, unique slug, summary, description, skill body,
usage instructions, category, supported tools, version label, and license.
Optional fields: tags and external source/documentation URLs. Each skill also has
an owner, publication status, and creation/update timestamps. Compatibility is
creator-declared and displayed as such. Initial versioning uses a label rather than
full release history. File uploads are outside the initial MVP.

## MVP Pages and Capabilities

| ID     | Page / capability              | Required behavior                                                                                                                                         |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MKT-01 | Landing page `/`               | Explain the marketplace, show published featured/latest skills, and provide Browse Skills and Publish a Skill calls to action.                            |
| MKT-02 | Skill list `/skills`           | Show published skills with search, category/tag/tool filters, sorting, pagination, and loading/empty/error states.                                        |
| MKT-03 | Skill detail `/skills/[slug]`  | Display metadata, creator, license, compatibility, Markdown content, and usage instructions; allow copying the skill body.                                |
| MKT-04 | Authentication                 | Support registration, login, logout, email verification, and password recovery. Require a verified account to publish.                                    |
| MKT-05 | User panel `/dashboard/skills` | Create, read, update, and delete owned skills; save drafts, publish, and unpublish; confirm destructive actions.                                          |
| MKT-06 | Admin users `/admin/users`     | List, search, create, view, update, suspend/reactivate, change roles, and delete users. Creation sends an invitation; administrators never see passwords. |
| MKT-07 | Admin skills `/admin/skills`   | List, search, create, view, update, publish/unpublish, feature, and delete any skill; assign an owner and record administrative changes.                  |

## Roles and Access

| Actor   | Permissions                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Visitor | Browse and copy published skills; register or log in.                                                              |
| User    | Visitor capabilities plus full CRUD on their own skills. Cannot edit other users' skills or access administration. |
| Admin   | User capabilities plus management of all users and skills.                                                         |

Authorization must be enforced server-side for every protected read and mutation.
Drafts are visible only to their owner and admins; direct public URLs must not expose
them. Public profiles expose only display names and public creator information,
never email addresses. Prevent deleting, suspending, or demoting the last active admin.

## Proposed Product Rules and Assumptions

- The MVP is a free sharing marketplace. Paid listings and transactions require a separate specification.
- Creators may publish immediately after email verification; admins can unpublish inappropriate content. Pre-publication approval is not included initially.
- Skill statuses are `draft` and `published`. Unpublishing returns a skill to draft and removes it from public discovery.
- User statuses are `invited`, `active`, and `suspended`. Suspended users cannot access protected actions; their published skills are hidden until reactivation.
- User deletion removes authentication access and associated private data. Owned skills must be explicitly deleted or reassigned to an active owner in the same operation; there must be no orphaned skills.
- Deleted skills disappear from public pages and panels. Define backup retention separately from application-level deletion.
- Admin actions affecting users, roles, ownership, or skill content/publication are recorded in an audit log with actor, target, action, and timestamp; do not store full skill bodies or credentials in logs.
- Search initially covers title, summary, and tags. Sorting supports newest, recently updated, and title; no popularity score is claimed without usage data.
- Admin-created skills require an explicit owner. Bootstrap the first administrator using a documented server-side procedure, never public registration.

The requesting product owner approved these rules, skill format/metadata, free model,
taxonomy/licenses, capability ownership, and authentication/retention in F001 on
2026-10-03. See docs/decisions/001–003. Hosting/budget are explicitly deferred per ADR 004.

## Success Measures

Proposed release gates:

- All seven MVP capabilities satisfy their accepted specifications.
- Documented manual end-to-end checks pass for discovery, creator CRUD, admin user CRUD, and admin skill CRUD.
- Authorization checks demonstrate that users cannot access another user's drafts or mutate their skills, and non-admins cannot access admin operations.
- Core pages meet WCAG 2.2 AA requirements in scope, including keyboard access, labels, contrast, and focus states.
- Target p75 LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1 on public pages. Use prelaunch lab checks, then validate with field data when traffic is sufficient.

Proposed first-30-day adoption targets: 20 published skills from at least 5 creators,
100 registered users, and at least 25% of skill-detail sessions copying a skill.
Measure aggregate events without collecting skill bodies or unnecessary personal data;
review targets after launch against actual audience size.

## Constitutional Principles

1. **Specify before implementing.** Any change to product behavior must have a
   written specification reviewed and accepted by the project owner before coding.
   Documentation-only changes can use a brief written description.
2. **Describe outcomes before solutions.** Specifications define users, needs,
   scope, observable behavior, and acceptance criteria. Technical design belongs
   in the implementation plan.
3. **Make acceptance verifiable.** Every requirement must have a stable identifier
   and measurable acceptance criteria. Avoid unqualified terms such as "fast" or
   "user-friendly"; record actual targets when relevant.
4. **Resolve blocking uncertainty.** Do not silently invent product requirements
   or technology choices. Record assumptions and open questions; resolve any that
   affect acceptance, architecture, security, or scope before implementation.
5. **Deliver the smallest useful increment.** Favor independently verifiable
   slices. Add dependencies and abstractions only when current requirements
   justify them.
6. **Maintain traceability.** Connect requirements to implementation tasks and
   verification evidence. A feature is complete only when its accepted behavior
   is demonstrated.
7. **Build quality into the design.** Define relevant security, privacy,
   accessibility, reliability, and performance requirements in each specification.
   Keep credentials and secrets out of source control.
8. **Keep specifications current.** When behavior changes, update the specification
   and acceptance criteria before changing the implementation. Record material
   architecture decisions and their tradeoffs.

## Specification Contract

Each feature specification must include:

- Feature identifier, title, status, and owner.
- Problem, target users, and intended outcome.
- In-scope behavior and explicit exclusions.
- User scenarios, including relevant failure and edge cases.
- Numbered requirements (for example, `F001-R01`).
- Acceptance criteria linked to those requirements; Given/When/Then is encouraged.
- Relevant data, interface, and non-functional constraints.
- Assumptions, dependencies, and open questions.

Use these lifecycle states:

`Draft -> Accepted -> In progress -> Verified -> Released`

An accepted specification requires recorded approval by the project owner and no
unresolved blocking questions. Material changes to an accepted specification
return it to Draft for review.

## Definition of Done

A feature is done when:

- All in-scope requirements satisfy their acceptance criteria.
- Relevant automated checks and/or documented manual verification pass.
- Relevant failure cases and quality constraints have been verified.
- The specification, implementation, and user-facing documentation agree.
- Verification evidence and any remaining out-of-scope work are recorded.
- The project owner accepts the result; release conditions are met when applicable.

## Authority and Amendments

The three files in this directory form the project constitution:

- `mission.md`: purpose, governing principles, and acceptance standards.
- `tech-stack.md`: technology choices, constraints, and engineering rules.
- `roadmap.md`: delivery sequence and milestone exit criteria.

Feature specifications and implementation plans must conform to this constitution.
If these files conflict, resolve and document the conflict before proceeding;
the principles in this file govern the resolution.

Amendments must state the reason, affected sections, and impact on existing specs
and code. The project owner approves amendments. Update the version and append an
entry below; keep all three files consistent.

## Amendment History

Version 0.4.1 (2026-10-03), approved by the requesting owner's direct instruction:
development verification/resend bypass SMTP and display the token/code and link
in the terminal. This narrowly amends credential-log restrictions for these local
development tokens only; production/test and recovery logs stay redacted. See
F001 specification and ADR 003. No access-control or verification bypass is added.

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                 | Approval                                                                               |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 0.1.0   | 2026-10-03 | Created reusable SDD starter; product decisions remain pending.                                                                                                                                                                                                                                                                        | Pending project owner review                                                           |
| 0.2.0   | 2026-10-03 | Defined AI Skill Market mission, proposed MVP, roles, product rules, and success measures.                                                                                                                                                                                                                                             | Pending project owner review                                                           |
| 0.3.0   | 2026-10-03 | Revised stack to Express.js, EJS, JavaScript, and SQLite; removed prescribed hosting, error-reporting service, and automated test tooling; aligned roadmap verification.                                                                                                                                                               | Stack direction requested by product owner; remaining product proposals pending review |
| 0.4.0   | 2026-10-03 | Accepted MVP rules, metadata, taxonomy/licenses, capability ownership, authentication/retention policy in ADRs 001–003; deferred hosting/budget/staging per ADR 004 to permit local F001 delivery. Prior pending product statements are superseded by this approval. Adoption/performance targets remain proposed until launch review. | Explicit requesting product owner approval in F001 session                             |
