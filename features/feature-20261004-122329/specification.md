# Specification — Phase 2 Public Marketplace, SEO, and Dark Theme

| Field              | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| Feature ID         | F002 / feature-20261004-122329                                                |
| Product            | SkillMart (working title)                                                     |
| Roadmap scope      | Phase 2 — Public Marketplace, SEO, and Dark Theme                             |
| Mission coverage   | MKT-01–03; SEO-01–03; THEME-01–02                                             |
| Status             | In progress — implemented and locally checked; final owner acceptance pending |
| Owner              | Requesting product owner, per ADR 001                                         |
| Created            | 2026-10-04; timestamp uses local system time                                  |
| Branch             | `feature-20261004-122329`                                                     |
| Governing baseline | Constitution 0.6.0; strict TypeScript/Express/EJS/Prisma/SQLite               |

References: [mission](../../constitution/mission.md),
[roadmap](../../constitution/roadmap.md),
[technology stack](../../constitution/tech-stack.md),
[F001](../feature-20261003-113908/specification.md),
[ADR 001](../../docs/decisions/001-foundation.md),
[implementation plan](implementation.md), and [validation plan](validation.md).

This package follows the requested `features/<timestamped-feature>/` convention.
`implementation.md` combines technical design and ordered tasks; `validation.md`
contains acceptance checks and an evidence register. Creating these documents
does not establish specification approval or demonstrate application behavior.

## Problem, Users, and Outcome

The foundation supports account access, but `/` redirects to login and there is
no public discovery experience. Visitors need to find and evaluate instruction
packages without signing in. Creators need public attribution without revealing
private account information. Visitors and returning account holders need readable
interfaces that respect their theme preference.

Deliver a server-rendered landing-to-catalog-to-detail journey with safe Markdown,
reliable copy feedback, controlled search indexing, and shared light/dark/system
support. Search rankings are not an acceptance promise.

## Scope and Exclusions

In scope: development sample data, landing messaging and featured/latest skills,
catalog cards and URL-based discovery, public details, Markdown safety, clipboard
enhancement, loading/empty/error/not-found states, public metadata, crawler files,
query normalization, and shared theme behavior across public pages and existing
authentication/workspace/admin shells.

Excluded: creator/admin skill CRUD, user administration, invitation acceptance UI,
creator profile pages, ratings, popularity metrics, payments, uploads, executing
skills, version history, new hosting selection, and launch analytics. Later CRUD
must inherit the public visibility and theme foundations established here.

## Requirements and Acceptance Criteria

Each row is an observable acceptance boundary. `Rxx` means `F002-Rxx` throughout
this package. Proposed defaults below become binding only on owner acceptance.

| ID       | Requirement / mission reference                                     | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F002-R01 | Realistic, guarded sample catalog / Phase 2 seed                    | Given a disposable development database, seeding creates at least 25 public skills across the five approved categories, all four supported tools, varied tags/licenses, and multiple active creators. Fixtures also include drafts and published skills of suspended/invited owners. Repeating seed does not duplicate fixtures or overwrite unrelated data; production refuses fixture seeding.                                                                                      |
| F002-R02 | Public visibility / MKT-01–03, SEO-02                               | Given any viewer, only published skills owned by active users appear in landing, results, counts, detail responses, or sitemap. Draft, suspended/invited-owner, deleted, and nonexistent slugs all return the same generic public 404 without private content or metadata, even to an owner/admin using the public route. Subsequent requests reflect committed visibility changes without redeployment.                                                                              |
| F002-R03 | Landing / MKT-01                                                    | `/` returns 200 HTML explaining free instruction sharing and that skills are not executed. It shows up to six featured and six latest public skills with detail links, Browse Skills, and Publish a Skill. Empty sections have useful text and a browse action; no invented adoption or popularity claims appear.                                                                                                                                                                     |
| F002-R04 | Catalog cards and search / MKT-02                                   | `/skills` returns title, summary, category, tags, declared tools, creator display name, and detail link per result. A trimmed case-insensitive literal substring search matches title, summary, or tag name, not body or private fields. Empty search means browse; input constraints and malformed requests follow the query contract.                                                                                                                                               |
| F002-R05 | Filters, sort, shareable state / MKT-02                             | One category, one tag, and one tool may be selected together with search; different filter dimensions combine with AND, while search fields combine with OR. Newest, recently updated, and title sorting work with deterministic ties. Applied values persist in controls, result links, pagination, reload, shared URLs, and browser Back. Applying changed filters resets to page 1; Clear returns to `/skills`.                                                                    |
| F002-R06 | Pagination and query boundaries / MKT-02, SEO-03                    | Results use a fixed page size of 12, show total count/current page, and provide crawlable numbered/previous/next links. Page 1 with zero matches is a 200 empty state; page greater than the last page is a real 404. Invalid input is handled without unbounded queries or a server error; normalization follows the policy below.                                                                                                                                                   |
| F002-R07 | Complete public details / MKT-03                                    | `/skills/:slug` displays title, summary, description, category/tags, public creator display name, license, version label, declared compatibility, created/updated dates, body, usage instructions, and safe optional source/documentation links. No email, credential, or private profile data is exposed. Compatibility is explicitly creator-declared.                                                                                                                              |
| F002-R08 | Safe instruction rendering / MKT-03                                 | Body and usage Markdown support headings, lists, links, and code blocks. Raw HTML and executable URL schemes cannot execute; embedded remote media is not loaded. User metadata is escaped. Rendering never executes instructions, and external links are restricted to HTTP(S).                                                                                                                                                                                                      |
| F002-R09 | Copy and progressive enhancement / MKT-03                           | Activating Copy copies the exact original skill body, including line breaks, and announces success only after the clipboard write succeeds. Failure offers selectable raw text/manual-copy instructions and accessible feedback without losing focus. With JavaScript unavailable, raw instructions remain selectable and the browsing journey works.                                                                                                                                 |
| F002-R10 | Loading, empty, and failure states / MKT-01–03                      | GET form submission shows accessible pending feedback when enhanced, without depending on JavaScript for navigation. Copy has pending/success/failure feedback. Empty catalog and no matches have distinct recovery actions. Missing skills/pages return 404; internal failures return generic 500 without stack traces, private metadata, or logs containing bodies/tokens. Controls recover after canceled navigation or Back.                                                      |
| F002-R11 | Initial HTML and metadata / SEO-01, SEO-03                          | Landing, catalog, and published details contain main content, descriptive page-specific title/description, absolute canonical, escaped Open Graph title/description/type/url, and Twitter summary-card metadata in the initial HTTP HTML. URLs derive from validated APP_URL, not request Host. Paginated browse titles identify the page.                                                                                                                                            |
| F002-R12 | Canonical and indexing policy / SEO-02–03                           | The query/indexing matrix below is honored. Auth/token, dashboard/admin, unavailable skill, and error responses receive `noindex` in HTTP headers and, for HTML, head metadata. Private strings/token URLs are never placed in sharing metadata or canonical URLs. Crawling restrictions never grant access.                                                                                                                                                                          |
| F002-R13 | Crawler files / SEO-02                                              | `/robots.txt` references the absolute sitemap and disallows protected/auth paths. `/sitemap.xml` is valid escaped XML containing only `/`, `/skills`, and eligible public detail canonical URLs. Detail lastmod uses actual skill update time. Unpublish, suspension, deletion, and reactivation are reflected on the next sitemap request. Query variants and errors are absent.                                                                                                     |
| F002-R14 | Theme selection / THEME-01                                          | A labeled keyboard-accessible Light/Dark/System selector is in the shared interface. System is default. Explicit choices survive navigation/reload when storage is available; System follows OS changes, while explicit modes do not. Invalid/unavailable storage safely falls back to System; blocked storage still permits changing theme for the current document.                                                                                                                 |
| F002-R15 | Initial and complete theme rendering / THEME-02                     | Both themes cover public pages, existing auth/workspace/admin shells, forms, validation, code/Markdown, and empty/error states. The resolved theme is applied before visible paint under Helmet CSP. CSS provides readable system fallback without JavaScript; switching themes causes no layout shift or loss of feedback/focus. Native controls match color-scheme.                                                                                                                 |
| F002-R16 | Accessibility, quality, and maintainability / mission quality gates | Core journeys work at 375/768/1440 CSS-pixel widths and 200% zoom, with semantic headings, labels, keyboard navigation, skip link, visible unobscured focus, and screen-reader feedback. Normal text meets 4.5:1 and large text/required control/focus indicators 3:1 in both themes. Strict type-check, server/client builds, lint, formatting, and relevant F001 regressions pass. Record public-page lab performance against the mission targets with environment and limitations. |

## Catalog Query Contract (Proposed for Approval)

| Parameter  | Accepted values / behavior                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`        | Single string, trimmed, at most 100 characters; literal case-insensitive substring. Empty is omitted. `%` and `_` are literals, not wildcard operators.                                |
| `category` | Single existing category slug; blank omitted. Unknown value is a 400 validation error.                                                                                                 |
| `tag`      | Single existing normalized tag name; blank omitted. Unknown value is a 400 validation error.                                                                                           |
| `tool`     | Single approved tool name from persisted taxonomy; blank omitted. Unknown value is a 400 validation error.                                                                             |
| `sort`     | `newest` (default), `updated`, or `title`; default omitted. Dates descending; title ascending using a documented case-insensitive comparison. Final tie-breaker is skill ID ascending. |
| `page`     | Positive safe integer, maximum 10000; default 1 omitted. Page exceeding result range is 404, malformed/out-of-limit value is 400.                                                      |

Repeated recognized parameters or nonscalar/malformed values return 400 with safe
feedback. Unknown parameters are discarded by a 302 redirect to the normalized
equivalent; valid but non-normalized requests also redirect. Invalid recognized
values are rejected before normalization. Stable URL order is `q`, `category`,
`tag`, `tool`, `sort`, `page`; all values are encoded. Invalid requests are noindex.

Public links use normalized URLs. A GET filter form omits/resets `page`; pagination
retains all applied values. Search is literal rather than fuzzy or ranked.

## Canonical and Indexing Matrix

| Response                                                                     | Canonical                                                    | Indexing / sitemap                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `/`, `/skills`, eligible `/skills/:slug`                                     | Absolute normalized URL                                      | `index,follow`; included in sitemap                            |
| Unfiltered default-sort `/skills?page=N`, N > 1 and valid                    | Absolute self URL including page                             | `index,follow`; excluded from sitemap, reachable by pagination |
| Catalog with nonempty search/filter or nondefault sort, including pagination | Absolute normalized self URL retaining meaningful parameters | `noindex,follow`; excluded from sitemap                        |
| Default/empty/unknown query variants                                         | Redirect to normalized equivalent                            | No sitemap entry; destination policy applies                   |
| Landing/detail with extraneous query parameters                              | Redirect to query-free URL                                   | Destination policy applies                                     |
| Auth/token, protected, unavailable, validation-error, 404/500 responses      | Omit canonical and sharing URL metadata                      | `noindex` (HTML and HTTP); excluded from sitemap               |

Filtered variants use a normalized self canonical rather than claiming their
different content is the unfiltered catalog. `noindex` controls their indexing.
Do not disallow catalog query variants in robots.txt: crawlers must be able to
observe noindex. Account/token responses retain restrictive referrer handling.

## User Scenarios and Edge Cases

1. A visitor browses featured content, combines a category and tool filter, moves
   to page 2, shares that URL, opens a detail, and copies the original instructions.
2. A search matches only a tag; changing a filter resets pagination. No matches
   offer Clear Filters, while a never-populated catalog explains its empty state.
3. A draft or suspended-owner slug is requested directly, including by its owner:
   the public response is the same generic 404 as a nonexistent slug.
4. A fixture contains HTML, script-like links, quotes, XML characters, and long code:
   pages/metadata/XML stay valid and safe; code scrolls locally without page overflow.
5. Clipboard access is denied or JavaScript is disabled: the body is still available
   for manual selection, and no false copy-success message appears.
6. A returning dark-mode user reloads on a light OS; the first visible paint is dark.
   Returning to System follows live OS changes. Storage failures do not break pages.
7. A crawler requests search URLs, a token page, and out-of-range pagination:
   directives/statuses match the matrix and no private data enters metadata.

## Constraints, Dependencies, and Approval

- Reuse F001 schema, sessions, current-user middleware, and authorization services;
  preserve existing SQLite records and BigInt timestamps. No reset/db push on retained data.
- Use native GET forms, EJS partials, semantic CSS tokens, and compiled browser
  TypeScript. Follow `ui-ux-pro-max` guidance for scoped UI work.
- Sample taxonomy/licenses follow ADR 001. Seeds are local fixtures, not launch inventory.
- F001 local evidence exists, but final acceptance and HTTPS staging remain pending.
  Confirm foundation readiness before implementation; hosting remains deferred per ADR 004.
- Proposed choices needing owner approval: query defaults/limits, filter semantics,
  landing limits, copy fallback, indexing matrix, and interim Publish CTA behavior.
- Interim Publish CTA: anonymous visitors go to `/login`, signed-in users to
  `/dashboard`, with truthful messaging that skill editing arrives in Phase 3.
  Phase 3 replaces this destination with its accepted creator workflow.

Approval recorded 2026-10-04: the requesting owner's direct instruction to implement
Phase 2 in this package accepts the specification/plan and proposed boundaries for
local implementation. F001's TypeScript/Prisma local evidence was reviewed as the
entry baseline; regressions will be rerun. Hosting/staging and final acceptance
remain deferred. No blocking questions or architecture changes remain.

| Gate                                                | Status / evidence                                       |
| --------------------------------------------------- | ------------------------------------------------------- |
| Phase 2 scope authority                             | Approved in constitution 0.6.0; includes SEO and themes |
| F002 specification and implementation plan approval | Approved by direct implementation request, 2026-10-04   |
| Application coding                                  | Implemented locally; see implementation.md              |
| Verification / final owner acceptance / release     | Pending; see validation.md                              |

Lifecycle: `Draft -> Accepted -> In progress -> Verified -> Released`. Record
approval date and accepted revision here before coding. Material scope changes
return the specification to Draft. Verification requires evidence for every R01–R16
and subsequent owner acceptance; a documentation check is not a Phase 2 pass.
