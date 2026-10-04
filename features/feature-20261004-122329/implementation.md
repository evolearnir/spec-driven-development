# Implementation Plan — Phase 2 Public Marketplace, SEO, and Dark Theme

Feature: `feature-20261004-122329` / F002.\
Status: Implemented locally 2026-10-04; verification evidence recorded; final owner acceptance pending.
Requirements: [specification.md](specification.md).\
Checks and evidence: [validation.md](validation.md).

## Baseline and Entry Gate

The repository already has strict TypeScript, Express 5, EJS, Prisma Client 6.19,
SQLite, auth/session/CSRF middleware, account lifecycle policies, and a skill schema.
`src/app.ts` currently redirects `/` to `/login`, renders foundation `/dashboard`
and `/admin` shells, and supplies centralized errors. There is no public router yet.
`src/db/seed.ts` provides minimal auth fixtures, not the realistic Phase 2 catalog.
Markdown libraries are already runtime dependencies; check/add compatible type
declarations if required by strict TypeScript rather than weakening compiler rules.

Read constitution 0.6.0, ADRs 001–005, and F001's current validation evidence. Record
owner approval of this specification/plan and foundation readiness before coding.
Keep the requested three-file package instead of introducing a separate tasks file.

## Architecture and Proposed File Boundaries

| Location                                                          | Responsibility                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/validators/catalog.ts`                                       | Parse scalar query values, validate limits/taxonomy, normalize state and URL serialization          |
| `src/repositories/skills.ts`                                      | Prisma public predicate, landing queries, filtered counts/list, eligible detail and sitemap records |
| `src/services/marketplace.ts`                                     | Catalog/result DTOs, deterministic sorting/pagination, safe public creator projection               |
| `src/services/markdown.ts`                                        | Markdown-it configuration and sanitize-html allowlist                                               |
| `src/services/seo.ts`                                             | APP_URL-based canonical/sharing metadata, indexing policy, escaped XML sitemap representation       |
| `src/controllers/public.ts`, `src/routes/public.routes.ts`        | Landing/catalog/detail/crawler HTTP responses, normalization redirects and real statuses            |
| `src/views/public/`                                               | Landing, list, detail; result and copy states rendered server-side                                  |
| `src/views/partials/`                                             | Shared metadata/navigation/theme control/skill card/pagination patterns; reuse existing head/footer |
| `public/css/`, `src/client/theme-init.ts`, `src/client/theme.ts`  | Semantic theme tokens, early resolution, selector and OS/storage listeners                          |
| `src/client/copy.ts`, existing form module                        | Clipboard enhancement and pending form feedback with robust restoration                             |
| `src/db/seed.ts` or a delegated seed module                       | Guarded realistic fixtures preserving existing F001 fixtures                                        |
| `scripts/check-local.ts`, optional `scripts/check-marketplace.ts` | Disposable HTTP/service verification using existing project conventions                             |

Names are proposed; adapt to existing module exports without unnecessary renaming.
Controllers are thin, business behavior belongs in services, persistence in typed
repositories. Relative server imports retain `.js` for compiled ES modules.

## Persistence and Public Visibility

Use a shared Prisma predicate equivalent to
`{ status: "published", owner: { status: "active" } }` for every public query,
including detail, count, featured/latest, and sitemap. Public DTOs select only the
owner ID/display name needed for attribution; never spread a complete user record.
Do not add a verification predicate to public reads: verified publication is a
mutation rule, while the constitutional visibility predicate is published/active.

Reuse existing skill/category/tag/tool/link relations. Query selected fields and
relations in bounded batches, avoiding per-card queries. Count and paginated list
should use a consistent transactional snapshot. Return 404 if page > max page;
zero matches still permits page 1. Convert millisecond BigInt dates explicitly for
display and ISO lastmod, without serializing raw BigInt to JSON.

Implement literal case-insensitive matching with Prisma filters where semantics
are supported; verify SQLite behavior with mixed case and literal `%`/`_`. If Prisma
cannot express the accepted comparison, use a narrowly scoped bound raw query
with escaped LIKE patterns and a static whitelist of sort expressions. Never
interpolate query input into SQL identifiers. Title/date ties end with ID ascending.

No schema migration is currently required. Add indexes only when measured query
plans justify them; any change requires reviewed Prisma Migrate SQL against a
disposable database, with legacy-data preservation checks. No catalog response cache
is planned initially, so visibility changes apply on subsequent requests.

## Fixtures

Extend guarded development seeding with stable fixture slugs and transactions.
Look up taxonomy by slug/name rather than relying on numeric IDs. Seed enough
eligible records for three pages, multiple creators, featured flags, all taxonomy,
diverse tags and licenses, and fixed date/title ties. Include private/ineligible
records and safe test payloads for Markdown and escaping verification.

Reruns create missing fixture records/relationships but preserve existing unrelated
records and operator edits. Keep F001 auth fixtures compatible; do not publish
known fixture credentials. Document `NODE_ENV=development`, `SEED_ENABLED=true`,
and a disposable `DATABASE_PATH`. Ensure the CLI guard rejects production before writes.

## HTTP and SEO Integration

| GET route       | Design                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| `/`             | Replace login redirect with landing; normalize extraneous query parameters     |
| `/skills`       | Validate/normalize query, list/count, metadata/index policy, retained controls |
| `/skills/:slug` | Eligible detail only; sanitized Markdown and original raw body for copy        |
| `/robots.txt`   | Plain text crawler policy and absolute sitemap location                        |
| `/sitemap.xml`  | XML escaped canonical public pages/details and actual detail update times      |

Register public routes before the existing catch-all. Preserve session/auth/CSRF
behavior and no-store protections on personalized/auth pages; public reads do not
mutate catalog data. Keep the current no-store baseline initially rather than
introducing caching that can leak personalized navigation or stale publication.

Build URLs using validated `config.APP_URL` and the specification's normalized
parameters, never request Host. Ensure origin/path composition handles the approved
APP_URL shape. Share one metadata object with escaped EJS attributes. XML escaping
is separate from HTML escaping. Avoid third-party sharing image dependencies;
Twitter `summary` does not require adding uploads or remote media.

Set a default `X-Robots-Tag: noindex` before routes that can reject/redirect protected
access or encounter errors; eligible public controllers explicitly apply their
index policy. The centralized error handler must restore noindex and omit any
previously computed public canonical/share metadata. Health and nonpublic dynamic
responses remain excluded. Token-page metadata must never incorporate the query.
Do not block catalog query URLs in robots.txt, so noindex remains observable.

Generate sitemap dynamically from the shared predicate; stream/batch records if
needed to remain bounded. If future inventory exceeds sitemap protocol limits,
add sitemap partitioning before that limit is reached. For this increment, no
background regeneration or redeployment is needed for lifecycle changes.

## Markdown, Copy, and UI

Configure Markdown-it with raw HTML disabled; sanitize output using a strict list
of prose/code elements and permitted HTTP(S) links, without remote media, styles,
event handlers, or executable schemes. Sanitize body and usage separately. Only
sanitized output and trusted partials use unescaped EJS output. Render original
body in an escaped textarea/preformatted fallback for exact clipboard copying.
Source/documentation links are separately validated even for legacy records.

Use shared cards, labeled native GET inputs/selects, semantic pagination links with
current-page indication, empty-state recovery, and one page heading. Keep the
existing UI foundation recognizable. Apply `ui-ux-pro-max` accessibility, native
control, long-text reflow, and paired-theme guidance; do not introduce a frontend
framework. Use readable body text, a responsive grid, and locally scrollable code.

Copy uses `navigator.clipboard.writeText` on user activation, awaits success, and
announces through a polite status region. On rejection/unavailability, display
manual-copy instructions and selectable original text without false success.
Enable Copy only after enhancement initializes; no-JS text remains usable.
GET form pending state must preserve form serialization and allow navigation;
restore controls on `pageshow`/canceled submission so Back does not leave them disabled.

## Theme and CSP Design

Add semantic custom properties for page/surface/text/muted text/borders/links,
focus, success/error, fields, and Markdown/code. Define light/dark mappings together;
all existing public/auth/workspace/admin/error styles consume them. Native controls
use matching `color-scheme`. CSS `prefers-color-scheme` supplies the no-JS fallback.

Store `light` or `dark` in a namespaced localStorage key; System removes the explicit
override. Validate stored values and catch all storage access failures. The current
document may retain an in-memory preference when persistence is blocked. Listen
for OS preference changes in System mode; ignore them for explicit choices.

Compile a tiny early initializer as a classic script with no imports/exports and
load it synchronously from the existing same-origin browser asset path in the
head before styles/content can paint. Verify the emitted file is classic-script
compatible. A deferred module handles the selector, storage events, and OS changes.
Keep Helmet's restrictive `script-src 'self'`; do not enable unrestricted inline
scripts. If an inline alternative proves necessary, document a nonce/hash design
and its tradeoff before changing CSP. No-JS fallback hides or explains the inactive
selector rather than offering a misleading working control.

## Ordered Tasks and Traceability

T01–T11 are complete for the local implementation. T12 has local defects resolved
and evidence/limitations recorded; final owner acceptance is pending. `Txx`, `Rxx`,
and `Vxx` abbreviate F002 identifiers. The table below retains the accepted task
boundaries and dependency traceability.

| Task     | Work / dependencies                                                                                               | Requirements      | Validation        |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------- |
| F002-T01 | Record owner approval, settle proposed defaults, confirm F001 local readiness                                     | All               | V01               |
| F002-T02 | Add guarded realistic seed and fixture instructions; depends on T01                                               | R01               | V02               |
| F002-T03 | Add query validator/normalizer and shared public repositories/services; depends on T01                            | R02, R04–R06      | V03, V05–V07      |
| F002-T04 | Build landing/cards/GET catalog/pagination and responsive states using UI guidance; depends on T02–T03            | R03–R06, R10, R16 | V04–V07, V10, V17 |
| F002-T05 | Add detail DTO, safe Markdown and validated links; depends on T03                                                 | R02, R07–R08      | V03, V08–V09      |
| F002-T06 | Add copy/manual fallback and pending feedback; depends on T04–T05                                                 | R09–R10           | V10               |
| F002-T07 | Add metadata, canonical/query rules and error/protected noindex; depends on T03–T05                               | R11–R12           | V11–V12           |
| F002-T08 | Add robots/sitemap using public predicate; depends on T03, T07                                                    | R02, R13          | V03, V13          |
| F002-T09 | Add shared paired theme tokens, early CSP-safe initialization and selector; depends on T01                        | R14–R15           | V14–V16           |
| F002-T10 | Apply themes to all existing shells, forms, Markdown and states; depends on T04–T05, T09                          | R15–R16           | V16–V17           |
| F002-T11 | Document routes/query/theme/seed behavior; run disposable checks, builds and F001 regressions; depends on T02–T10 | All               | V02–V18           |
| F002-T12 | Resolve defects, record evidence/limitations and request owner acceptance; depends on T11                         | All               | V01–V18           |

## Rollout and Recovery

Deliver locally after approval, preserving retained databases. Record any new type
dependencies in package/lockfile, rebuild browser/server outputs, and update README
with the development fixture and public journey commands. Repeat relevant checks
under HTTPS staging when hosting is selected; do not claim deferred staging passed.

Rollback application code and rebuild assets together. With no planned schema
changes, rollback needs no database reset. Fixture cleanup is limited to explicitly
identified disposable development records. If a migration becomes necessary,
document a consistent backup and separate schema/data recovery procedure first.

Finish only when every requirement has actual verification evidence, defects are
resolved or explicitly out of scope, and the project owner accepts the result.

## Implementation Record — 2026-10-04

- Owner's implementation request accepted this package and local F001 entry evidence.
- Added public repository/service/router, scalar Zod query contract, bounded
  transactional result/count queries, EJS landing/catalog/detail/card templates,
  server-rendered metadata, dynamic robots/sitemap and default/error noindex.
- Prisma cannot express SQLite literal INSTR matching or LOWER title ordering;
  the repository uses bound Prisma SQL for those operations and a static sort
  whitelist. SQLite LOWER is ASCII case-insensitive; Unicode case folding is not
  claimed. Title/date ties use skill ID ascending. No schema change was needed.
- Seed selects taxonomy by slug/name, creates realistic samples, tied title/date
  fixtures and unsafe-content fixtures, preserves existing edits and relationships,
  and keeps the production CLI guard. Existing database CHECK constraints remain.
- Markdown disables raw HTML, sanitizes prose/code, shifts instruction headings
  below page sections, removes embedded media and rejects unsafe resource links.
- Clipboard receives the exact body via an escaped JSON attribute, preserving
  initial newlines/CRLF that HTML textarea parsing would normalize. Pending copy
  uses aria-disabled plus a reentry guard to retain focus. Failure opens manual text.
- Shared semantic tokens cover both themes. A classic synchronous same-origin
  initializer runs before CSS; deferred controls synchronize storage/OS changes.
  Control space is reserved before enhancement to prevent layout shifts.
- UI guidance: loaded ui-ux-pro-max; initial design-system recommendation was
  off-tone for this existing paired-theme UI. Focused Minimalism & Swiss Style
  guidance was verified and applied through content-first grids, native controls,
  high contrast, wrapping, labels, skip/focus and 44px control targets, preserving
  the established purple identity and system fonts.
- Added `npm run check:marketplace` with disposable HTTP/service/seed/lifecycle
  checks. Optional temporary Playwright tooling exercised actual Chrome without
  adding a browser framework to application dependencies. See validation.md.
