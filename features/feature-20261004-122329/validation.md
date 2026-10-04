# Validation Plan and Evidence — Phase 2

Feature: `feature-20261004-122329` / F002.\
Status: Local HTTP/service/browser and engineering checks passed 2026-10-04;
owner acceptance and documented manual/environment follow-ups remain pending.
Hosting remains deferred.
Sources: [specification.md](specification.md), [implementation.md](implementation.md).

## Method and Prerequisites

Use the existing manual/HTTP/service verification approach, TypeScript checks,
builds, lint, and formatting. No new automated test framework is required. Do not
transfer F001 passes to F002 requirements or mark planned behavior as verified.

Before execution:

1. Record owner approval, accepted document revision, branch/commit, operator,
   date, OS, Node/npm versions, browser versions, APP_URL, and environment.
2. Use a disposable SQLite database with migrations applied; keep retained local
   and production data separate. Record exact fixture commands after implementation.
3. Seed at least 25 eligible skills, multiple active verified creators, featured
   and unfeatured records, every category/tool, overlapping tags, date/title ties,
   and at least three catalog pages. Include a tag-only search match.
4. Include draft, suspended-owner, invited-owner, deleted, and nonexistent slugs;
   a long-code/URL record; and malicious Markdown/title/summary/link/XML payloads.
5. Prepare anonymous, active user, and admin browser sessions for navigation-shell
   and protected-route checks. Do not record passwords, tokens, cookies, emails,
   private skill bodies, or identifiable account data in evidence.
6. Use controlled repository/service mutations on the disposable database for
   publish/unpublish/suspension/reactivation/deletion checks. Do not introduce
   public debug endpoints or depend on later-phase CRUD screens.

## Acceptance Scenarios

`Rxx` abbreviates `F002-Rxx`. The Not run column below preserves the original
planning baseline. The execution evidence below is the authoritative current status.

| Check    | Requirements  | Procedure                                                                                                                                                                                                                          | Expected outcome                                                                                                                                                                                        | Result  |
| -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| F002-V01 | All           | Review constitution coverage, linked requirements/tasks/checks, proposed defaults, owner approval, and F001 readiness.                                                                                                             | Scope includes MKT-01–03, SEO-01–03, THEME-01–02; approval is recorded before coding; deferred foundation/staging work is explicit.                                                                     | Not run |
| F002-V02 | R01           | Migrate and seed a disposable development database twice; inspect taxonomy, fixture counts, relations, unrelated records and edited fixtures. Attempt CLI seed with production configuration.                                      | At least 25 eligible skills and all required fixture classes exist; no duplicates/unrelated overwrites; production refusal occurs before writes.                                                        | Not run |
| F002-V03 | R02, R13      | Request landing/list/counts/details/sitemap anonymously and as owner/admin; then publish/unpublish, suspend/reactivate, reassign to draft, and delete fixtures through controlled local services; repeat requests.                 | All public surfaces use published/active predicate; next request reflects changes; every ineligible/missing public slug yields generic 404/noindex without private content.                             | Not run |
| F002-V04 | R03           | Fetch `/` without JavaScript, inspect messaging/cards/CTA destinations as anonymous and signed-in viewers. Repeat with zero featured and zero eligible records.                                                                    | 200 initial HTML; up to six featured/latest cards; truthful browse/publish messaging; empty states work and interim CTA reaches login/dashboard appropriately.                                          | Not run |
| F002-V05 | R04–R05       | Search mixed-case title, summary, tag-only text, blank text, literal `%`/`_`, and body-only text. Combine category/tag/tool/search; test all sorts and tied fixtures.                                                              | Only specified search fields match literally; filters AND together; ties are stable; no private matches/counts or popularity claims.                                                                    | Not run |
| F002-V06 | R05–R06       | Traverse three pages, compare counts/results, share/reload URL, use Back, alter filters on page 2, and Clear. Test zero matches and page beyond last.                                                                              | Twelve results per full page; no overlap caused by unstable sort; state retained; filter change resets page; zero page 1 is 200, out-of-range page is 404.                                              | Not run |
| F002-V07 | R04–R06, R12  | Try repeated/scalar-malformed parameters, unknown taxonomy/sort, 101-character q, page 0/negative/fraction/unsafe/10001, empty/default values, unknown tracking keys, reordered/encoded parameters.                                | Invalid recognized values give safe 400/noindex; valid non-normalized/unknown-key variants redirect once to stable encoded URL; page cap enforced; no 500, query injection, or redirect loop.           | Not run |
| F002-V08 | R07           | Inspect detail HTML for all published fields, attribution, dates, declared compatibility, and optional links; inspect source for user secrets.                                                                                     | Complete metadata/body/usage; public display name only; valid dates/license/version; no email, password hash, token, or private profile information.                                                    | Not run |
| F002-V09 | R08, R11, R13 | Render HTML/script/event-handler Markdown, javascript/data URLs, image embeds, long code, quotes and XML characters in fixture metadata/links. Inspect DOM, CSP, network and sitemap parse.                                        | No execution or embedded remote media; unsafe links absent; metadata/HTML/XML escaped and valid; sanitized prose/code still readable.                                                                   | Not run |
| F002-V10 | R09–R10       | Copy a multiline body and compare clipboard to exact stored raw text. Deny clipboard, remove Clipboard API, disable JavaScript, slow form navigation and use Back/canceled navigation; simulate empty catalog and service failure. | Honest pending/success/failure announcements, manual copy remains possible, GET browsing works without JS, controls recover, distinct empty recovery and real generic 500/noindex occur.                | Not run |
| F002-V11 | R11           | Fetch raw HTTP HTML for `/`, `/skills`, `/skills?page=2`, and a public detail, without executing JS. Change request Host to an untrusted value; include quoted metadata.                                                           | Main content and page-specific title/description/canonical/OG/Twitter exist initially; URLs use APP_URL, page 2 title/self canonical differ, escaped content cannot break attributes.                   | Not run |
| F002-V12 | R12           | Check the indexing matrix for default/empty/search/filter/sort/paginated/unknown query URLs, extra detail query keys, auth/token pages, anonymous protected redirects, protected shells, 400/404/500.                              | Status/redirect/canonical policy matches spec; noindex present in headers and served HTML where required; no private/token canonical/share URLs; no stale public metadata on errors.                    | Not run |
| F002-V13 | R02, R13      | Fetch robots and parse sitemap XML; compare entries to eligible DB slugs and actual update timestamps, then repeat after lifecycle changes.                                                                                        | Correct content types, absolute sitemap reference, auth/protected rules, valid escaped XML, only canonical eligible pages, correct lastmod, next-request visibility changes.                            | Not run |
| F002-V14 | R14           | Keyboard-select Light/Dark/System; navigate across public/auth/shell pages and reload; change OS theme live in each mode; open another tab and inspect synchronized preference.                                                    | Labeled accessible selector, explicit persistence, System follows OS, explicit modes ignore OS; tabs update consistently if storage event enhancement is implemented.                                   | Not run |
| F002-V15 | R14–R15       | Start with light OS/dark stored preference and reverse; record slowed cold navigation first paint. Test missing/invalid/throwing storage, disabled JS and blocked initializer. Inspect CSP violations.                             | Correct resolved first paint when JS available; safe readable system fallback otherwise; blocked storage permits current-page selection; no broad inline-script permission or initialization exception. | Not run |
| F002-V16 | R15           | Inspect public/auth/dashboard/admin shells, forms/errors/not-found, Markdown/code and native selects in both themes; change theme during focus/validation.                                                                         | All surfaces/states use consistent tokens/color-scheme; no wrong-theme islands, hidden feedback, lost focus, or theme-induced layout shift.                                                             | Not run |
| F002-V17 | R16           | At 375/768/1440 widths and 200% zoom, keyboard the full discovery/copy/theme journey; inspect screen-reader names/status and measure rendered foreground/background contrast pairs in both themes.                                 | Logical headings/order/skip link, unobscured focus, readable wrapping, local code scrolling, operable targets; normal text >=4.5:1, large text/required controls/focus >=3:1.                           | Not run |
| F002-V18 | R16           | Run typecheck/build/lint/format and existing F001 local checks; execute new disposable HTTP/service checks. Record repeatable public-page lab timings with declared fixture size/network/device settings.                          | Engineering checks and auth/session/CSRF/lifecycle regressions pass; public performance compared to LCP <=2.5s, INP <=200ms, CLS <=0.1 with lab limitations reported.                                   | Not run |

INP and p75 field claims require sufficient real traffic. Lab interaction timings
are supporting evidence, not proof of field p75. Record any unmet target for owner
review rather than inventing a pass. HTTPS/staging checks remain pending until run.

## Execution Commands

Run these existing commands from the repository root after implementation:

```powershell
npm run typecheck
npm run build
npm run lint
npm run format:check
npm run check:local
```

Use `npm run db:migrate` and guarded `npm run db:seed` only after explicitly setting
a disposable `DATABASE_PATH` and confirming `NODE_ENV=development` and
`SEED_ENABLED=true` for seed. `npm run check:local` is F001 regression evidence
unless extended with explicitly identified F002 checks. Add the exact marketplace
verification invocation here when it exists; no new script is claimed today.

For raw responses, use a local validation APP_URL such as `http://localhost:3000`
and capture status, headers and source (not just a browser-rendered DOM):

```powershell
curl.exe -i "http://localhost:3000/"
curl.exe -i "http://localhost:3000/skills?page=2"
curl.exe -i "http://localhost:3000/skills?q=writing&sort=title"
curl.exe -i "http://localhost:3000/robots.txt"
curl.exe -i "http://localhost:3000/sitemap.xml"
```

Add fixture-specific detail, invalid-query, private-slug and lifecycle request
commands during execution. Redact sensitive response data before storing evidence.

Implemented repeatable marketplace check:

```powershell
npm run check:marketplace
```

This script migrates/seeds its own disposable database under OS-temp/opencode,
serves on an ephemeral loopback port and removes the database afterward. It does
not use the retained `.env` database or send SMTP. Seed is run twice and separately
refused under production configuration. An optional `MARKETPLACE_BROWSER_CHECK`
path loads temporary browser tooling; the default check needs no browser dependency.

## Evidence Register

For each executed check record date/operator, revision, environment, exact
procedure/command, actual outcome, evidence location, and linked defect. Use
Pass/Fail/Blocked/Not run, and retain earlier failures with their subsequent recheck.
Store safe evidence under this feature folder or link documented temporary artifacts.

| Check        | Date / operator       | Environment / revision                  | Actual result                  | Evidence                                         | Follow-up                      |
| ------------ | --------------------- | --------------------------------------- | ------------------------------ | ------------------------------------------------ | ------------------------------ |
| F002-V01–V18 | 2026-10-04 / OpenCode | Windows / uncommitted F002 working tree | Local execution recorded below | HTTP/service script and temporary Chrome tooling | Final owner acceptance pending |

### Local execution — 2026-10-04

Operator: OpenCode. Revision: uncommitted `feature-20261004-122329` working tree;
no commit/release requested. Environment: Windows, Node 24.16.0, npm 11.13.0,
Prisma 6.19/SQLite. APP_URL for metadata: `http://localhost:3000`; real test listener
uses an ephemeral `http://127.0.0.1:<port>`. Browser: headless Chrome
154.0.8037.93, Playwright 1.56.1 from preexisting temporary tooling. No retained
workspace database was migrated, seeded or mutated during checks.

| Check | Actual result / evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V01   | Pass: constitution mission/roadmap/stack, ADRs 001–005 and F001 TypeScript/Prisma evidence read. Owner's direct request recorded as package/defaults/local entry approval before coding.                                                                                                                                                                                                                                                                                          |
| V02   | Pass: fresh disposable migrations and two seeds; 30 realistic samples, three creators, all categories/tools/licenses, tied date/title cases, safety and ineligible fixtures. Count unchanged on rerun, operator description/tag retained; production CLI refused before writes. `scripts/check-marketplace.ts`.                                                                                                                                                                   |
| V03   | Pass scoped HTTP/service/browser: public predicate enforced for landing/results/count/detail/sitemap; draft/suspended/invited/missing URLs generic 404. Publish/unpublish, suspension/reactivation, reassignment-to-draft and deletion reflected immediately. Signed-in admin cannot read private public URLs. No role-dependent public read path exists.                                                                                                                         |
| V04   | Pass: initial 200 landing content, six featured/six latest, truthful instructions/not-executed messaging, anonymous login and signed-in dashboard Publish destinations, empty featured/latest recovery.                                                                                                                                                                                                                                                                           |
| V05   | Pass for SQLite comparison: mixed ASCII case, title/tag matches, excluded body text, literal percent/underscore, AND filters, all three stable sorts with tied dates and case-insensitive tied titles. SQLite LOWER is ASCII case-insensitive; full Unicode case folding remains a documented limitation.                                                                                                                                                                         |
| V06   | Pass: 12-card full pages, deterministic three-page traversal without overlap, totals/links, retained query state, filter resets page, shared/reloaded URLs, browser Back restores controls, zero-result 200/out-of-range 404.                                                                                                                                                                                                                                                     |
| V07   | Pass: duplicate and bracket/nonscalar recognized keys, unknown taxonomy/sort, overlong search, invalid/capped/unsafe pages rejected 400/noindex; reordered/empty/default/unknown keys normalize by a single 302 without loops.                                                                                                                                                                                                                                                    |
| V08   | Pass: all detail fields, public display-name-only attribution, dates/license/version/declared tools, body/usage and validated resource links in initial HTML; fixture emails absent.                                                                                                                                                                                                                                                                                              |
| V09   | Pass scoped: raw HTML/executable links escaped or removed, remote Markdown images absent from rendered DOM, valid code/prose and locally scrolling long code, quotes/XML metadata escaped, XML parsed without errors. Malformed persisted HTTP-looking resource URL rejected without weakening DB URL constraints.                                                                                                                                                                |
| V10   | Pass scoped: exact stored body supplied to Clipboard API including initial LF and mixed CRLF; native Windows clipboard readback matches modulo OS CRLF conversion. Success only after write completion. Rejection opens raw text and keeps keyboard focus; no-JS manual selection works. Slow GET pending, canceled submit and Back restoration exercised. Empty/no-matches differ; simulated persistence failure returns generic 500/noindex with only redacted structured logs. |
| V11   | Pass: raw initial HTTP main content/title/description/canonical/OG/Twitter; distinct page-2 title/self canonical; hostile Host cannot change APP_URL-based URLs; quoted user strings remain escaped.                                                                                                                                                                                                                                                                              |
| V12   | Pass scoped HTTP/browser: default/paginated indexability; search/filter/sort normalized self canonical and noindex; landing/detail query normalization; auth/token and anonymous protected redirects noindex; signed-in dashboard/admin noindex with no canonical; invalid/missing/failure pages noindex with no stale sharing URLs.                                                                                                                                              |
| V13   | Pass: plain-text robots sitemap reference and protected/auth rules; catalog query crawling allowed. XML contains only canonical public entries/actual lastmod; no query variants. Browser DOMParser validity and next-request lifecycle changes checked.                                                                                                                                                                                                                          |
| V14   | Pass scoped Chrome: labeled keyboard-operable selector, Light/Dark persistence across navigation/reload, live System changes, explicit OS independence and cross-tab storage synchronization.                                                                                                                                                                                                                                                                                     |
| V15   | Pass scoped Chrome: stored Dark on Light OS is resolved while CSS response is held, before styled paint; System fallback with invalid/throwing storage, in-document changes when blocked, no-JS dark fallback. Restrictive same-origin scripts; zero runtime/CSP errors. Full filmstrip under real device conditions not claimed.                                                                                                                                                 |
| V16   | Pass scoped Chrome: public/auth/workspace/admin/error/native-control/Markdown surfaces checked in both themes; semantic token parity, preserved copy/selector focus, no horizontal page overflow. Local lab CLS was zero.                                                                                                                                                                                                                                                         |
| V17   | Pass scoped Chrome: 375/768/1440 layouts and 720px reflow equivalent to 1440px at 200% zoom; visible labels, skip-to-main, keyboard selector/copy and solid focus ring. Contrast pairs measured from CSS tokens: minimum text Light 5.91:1, Dark 8.13:1; minimum control boundary Light 4.04:1, Dark 5.04:1. Actual OS screen-reader audit and real-device/native browser zoom remain manual follow-ups.                                                                          |
| V18   | F001 regression suite passed including legacy preservation, concurrent last-admin protection, auth/session/CSRF, backup/retention and compiled startup. Engineering commands and final marketplace recheck are recorded in the final check section. Supporting lab LCP/CLS values below; no field INP/p75 claim.                                                                                                                                                                  |

Temporary browser source/evidence:
`C:\Users\PREDATOR\AppData\Local\Temp\opencode\skillmart-browser\check-marketplace.ts`.
Compile with TypeScript into its `compiled/` subdirectory (so tsx's name helpers
are not injected into browser-evaluated callbacks), then execute:

```powershell
$env:MARKETPLACE_BROWSER_CHECK = 'C:\Users\PREDATOR\AppData\Local\Temp\opencode\skillmart-browser\compiled\check-marketplace.js'
npm run check:marketplace
```

Visually reviewed screenshots in the same temporary directory:
`marketplace-light-375.png` and `marketplace-dark-375.png`. Temporary tooling and
screenshots are not application dependencies or committed release artifacts.

Supporting lab sample before final fixture refinement: 33 eligible records,
720×450 CSS-pixel viewport, headless Chrome, loopback networking, no network/CPU
throttling, one sample/page, 300ms observation after load. LCP: landing 64ms,
catalog 36ms, safety detail 44ms; observed CLS 0 on all three. These meet the lab
LCP/CLS targets for this environment only. INP was not measured; it and p75 field
performance require representative interaction/device/traffic evidence. No hosting,
HTTPS staging or production-email pass is claimed.

## Defects and Acceptance Gates

Resolved local defects and harness corrections:

- Seed first failed the existing active-account/password CHECK; sample creators now
  receive unknown random-password hashes. Unsafe source-link fixture first failed
  the existing HTTP(S) CHECK; it now uses malformed HTTP-looking input for rendering
  rejection, with executable schemes checked separately. HTTP/F001 rechecks passed.
- Copy pending originally disabled its focused button; changed to guarded
  aria-disabled to retain focus. Keyboard failure test passed.
- Browser harness first inspected speculative CSS request before script execution;
  corrected to hold the response and inspect pre-styled-paint resolution.
- Native Windows clipboard normalizes EOL to CRLF; harness now verifies the exact
  API argument separately from normalized native readback. No application body
  normalization was introduced.
- tsx injected `__name` into evaluated callbacks; temporary tooling is compiled
  before import. Login navigation watcher was synchronized to the POST response;
  contrast parser expanded three-digit hex. Final browser recheck passed.

### Final engineering and marketplace recheck — 2026-10-04

| Command / check                                                    | Actual result                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                | Pass — strict server/browser/script checks                                                              |
| `npm run build`                                                    | Pass — compiled server and classic browser assets                                                       |
| `npm run lint`                                                     | Pass                                                                                                    |
| `npm run format:check`                                             | Initial final run reported public router formatting; formatted that file and recheck passed             |
| `git diff --check`                                                 | Pass — no whitespace errors                                                                             |
| `npm run check:local`                                              | Pass — F001 disposable migration/auth/policy/session/concurrency/backup/startup regressions             |
| `npm run check:marketplace` with temporary compiled browser module | Pass — final HTTP/service checks and scoped Chrome matrix, including two additional logout/login cycles |

Final browser lab supporting sample after fixture refinement: 34 eligible skills
at observation time (35 seeded public records minus the lifecycle-deletion case),
720×450 viewport, same unthrottled loopback environment. LCP: landing 60ms,
catalog 52ms, safety detail 44ms; observed CLS 0 for all three. Contrast minima
remain Light text 5.91:1 / controls 4.04:1, Dark text 8.13:1 / controls 5.04:1.
Full Unicode case folding, actual screen-reader/native-zoom/real-device checks,
representative lab interaction/INP and HTTPS staging remain documented follow-ups;
no full field-performance or released-milestone claim is made.

- [x] Owner approves specification and implementation plan; foundation readiness recorded.
- [x] T01–T11 implemented with requirement-to-check traceability maintained.
- [x] V01–V18 locally exercised to the scope/evidence above; limitations explicit.
- [x] Security, private visibility, Markdown, SEO, and scoped both-theme accessibility checked.
- [x] Relevant F001 regressions pass; final engineering recheck recorded below.
- [x] Performance/environment limitations and deferred hosting work documented.
- [x] User documentation matches implemented behavior.
- [ ] Owner accepts Phase 2 result; lifecycle becomes Verified.
- [ ] Release reference/deployment evidence recorded when applicable; lifecycle becomes Released.

## Documentation-Package Checks

These checks assess only this planning deliverable, separately from application
acceptance. Record results after creating and checking the package:

| Check                                                                      | Result                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Constitution files read; Phase 2 scope reflected                           | Completed during document preparation                                                 |
| Timestamped branch and matching feature folder                             | Created as `feature-20261004-122329`                                                  |
| Three document links, requirement/task/check coverage, Markdown formatting | Passed: references reviewed; R01–R16 covered by T01–T12 and V01–V18; Prettier applied |
| Application implementation and local browser validation                    | Implemented and locally checked; see current execution evidence                       |
| Final owner acceptance and release                                         | Pending                                                                               |
