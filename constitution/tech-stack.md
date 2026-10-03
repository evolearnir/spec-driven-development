# AI Skill Market — Technology Stack

Status: Owner-approved TypeScript/Prisma replanning baseline; implementation tracked by F001 and ADR 005. Hosting deferred per ADR 004.
Governed by: [Mission and Constitution](mission.md), version 0.6.0.

## Architecture

Build a server-rendered web application using **TypeScript, Node.js, Express.js, EJS, Prisma ORM, and SQLite**.
The landing page, public skill catalog, user panel, and admin panel share one
application. Express handles routing and request processing; EJS renders HTML;
SQLite stores users, skills, sessions, and administrative audit records.

Use a straightforward routes/controllers/services/repositories structure. Forms
submit to Express endpoints, and successful mutations redirect to a result page.
Small client-side TypeScript modules, compiled to browser JavaScript, handle interactions such as copying skill
content and confirmation dialogs.

## Frameworks and Libraries

| Area               | Technology                                           | Purpose                                                                                   |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Language           | Strict TypeScript, ES modules                        | Typed server code, browser interactions, and maintenance scripts.                         |
| Runtime            | Node.js 24 LTS                                       | Runs the Express application and maintenance scripts.                                     |
| Web framework      | Express.js 5                                         | Routing, middleware, form handling, and HTTP responses.                                   |
| Template engine    | EJS                                                  | Server-rendered HTML pages and reusable partials.                                         |
| Frontend           | HTML, CSS, vanilla TypeScript compiled to JavaScript | Responsive pages and lightweight interactions.                                            |
| Database           | SQLite                                               | File-based relational persistence with no separate database server.                       |
| ORM                | Prisma Client 6.19                                   | Generated typed queries, relations, and asynchronous transactions.                        |
| Schema migrations  | Prisma schema + Prisma Migrate                       | Version schema changes and deploy checked-in SQL migrations.                              |
| SQLite maintenance | better-sqlite3                                       | Legacy-baseline inspection and consistent live backup API only.                           |
| Sessions           | express-session + Prisma-backed session store        | Persistent sessions in the same database as accounts, with transactional revocation.      |
| Password hashing   | argon2, using Argon2id                               | Secure password storage and verification.                                                 |
| Validation         | Zod                                                  | Validate form fields and query parameters on the server.                                  |
| Markdown rendering | markdown-it + sanitize-html                          | Render skill instructions with raw HTML disabled and sanitize generated markup.           |
| HTTP protections   | Helmet + express-rate-limit + synchronizer           | Response headers, auth throttling, and session-backed CSRF tokens for form submissions.   |
| Email              | Nodemailer                                           | Send verification, password recovery, and invitation emails through configured SMTP.      |
| Configuration      | dotenv                                               | Load local environment variables; use deployment environment configuration in production. |
| Logging            | Built-in console logging with structured fields      | Record application errors and operational events with sensitive values redacted.          |
| Code quality       | TypeScript compiler + typescript-eslint + Prettier   | Strict type-checks, linting, compilation, and source formatting.                          |
| Package manager    | npm                                                  | Dependency scripts and reproducible installation through `package-lock.json`.             |
| Development reload | tsx watch                                            | Execute TypeScript and restart on server-source changes.                                  |

Compatible versions are pinned in package.json and package-lock.json, with Node.js
24 declared. Foundation commands are implemented and locally checked; later-phase
Markdown/discovery/CRUD behavior remains planned. Prisma generates its client on
installation; committed source excludes generated clients and compiled JavaScript.
Sessions use Prisma's Session model and expire on read/startup/daily cleanup.
CSRF uses csrf-sync's synchronizer-token implementation.

## Pages and Routing

| Area               | GET routes                                                                                          | Mutation behavior                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Public marketplace | `/`, `/skills`, `/skills/:slug`                                                                     | Public reads only.                                                                                |
| Authentication     | `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`, `/accept-invitation` | POST endpoints for registration, login/logout, verification, recovery, and invitation acceptance. |
| User skills        | `/dashboard/skills`, `/dashboard/skills/new`, `/dashboard/skills/:id`, `/dashboard/skills/:id/edit` | POST endpoints for create, update, publish, unpublish, and delete.                                |
| Admin users        | `/admin/users`, `/admin/users/new`, `/admin/users/:id`, `/admin/users/:id/edit`                     | POST endpoints for invitation/create, update, role changes, suspend/reactivate, and delete.       |
| Admin skills       | `/admin/skills`, `/admin/skills/new`, `/admin/skills/:id`, `/admin/skills/:id/edit`                 | POST endpoints for create, update, publication, featuring, ownership reassignment, and delete.    |
| Admin audit        | `/admin/audit`                                                                                      | Read-only view of administrative changes.                                                         |

Native HTML forms use GET for search/filtering and POST for mutations. Every
mutation requires validation, authorization, and a CSRF token. GET requests must
not change application state. Use Post/Redirect/Get after successful form submissions.

## Proposed Project Structure

```text
src/
  app.ts                         # Configure Express, middleware, and routers
  server.ts                      # Start HTTP server and handle shutdown
  client/forms.ts                # Browser source, compiled to dist/client/
  config/
  routes/
    public.routes.ts
    auth.routes.ts
    dashboard.routes.ts
    admin.routes.ts
  controllers/
  services/                      # Authentication and marketplace business rules
  repositories/                  # Typed Prisma queries and persistence
  middleware/                    # Session, role, status, ownership, CSRF, errors
  validators/
  db/
    connection.ts
    migrate.ts                   # Prisma deploy + non-destructive legacy baseline
    seed.ts
  views/
    partials/                    # Head, navigation, footer, form messages
    public/                      # Landing, skill list, skill detail
    auth/
    dashboard/skills/
    admin/users/
    admin/skills/
    admin/audit.ejs
    errors/
public/
  css/
  images/
scripts/
  bootstrap-admin.ts
  backup-db.ts
prisma/
  schema.prisma
  migrations/                    # Checked-in Prisma migration SQL
tsconfig.json                    # Strict checks across application and scripts
tsconfig.build.json              # Production server compilation
tsconfig.client.json             # Browser compilation
data/                            # Local database files; ignored by Git
constitution/
  features/                        # F001 package uses specification/implementation/validation.md
docs/decisions/
.env.example
```

Only `public/` and compiled browser assets in `dist/client/` are served as static content. Database files, application source,
configuration, and private data must never be exposed through static routes.

## SQLite Data Model

| Table                                   | Main fields / constraints                                                                                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| users                                   | ID, unique normalized email, display name, password hash, role (`user`/`admin`), status (`invited`/`active`/`suspended`), verification timestamp, timestamps. Invited accounts have no password until setup completes. |
| sessions                                | Prisma-managed sid, expiry, and JSON-serialized session payload; compatible with existing session records.                                                                                                             |
| auth_tokens                             | User reference, purpose (verification/reset/invitation), token hash, expiry, used timestamp.                                                                                                                           |
| skills                                  | ID, unique slug, title, summary, description, Markdown body, usage instructions, owner ID, category ID, version label, license, draft/published status, featured flag, timestamps.                                     |
| categories                              | ID, unique slug, name.                                                                                                                                                                                                 |
| tags / skill_tags                       | Normalized tags and skill/tag relationships.                                                                                                                                                                           |
| supported_tools / skill_supported_tools | Tool names and creator-declared compatibility relationships.                                                                                                                                                           |
| skill_links                             | Skill reference, link type, validated HTTP(S) URL.                                                                                                                                                                     |
| audit_events                            | Nullable actor reference, action, target type/ID, non-sensitive change summary, timestamp.                                                                                                                             |
| _prisma_migrations / schema_migrations  | Prisma migration history; legacy history retained for non-destructive baseline adoption.                                                                                                                               |

- Enable foreign keys on every connection, WAL mode, and a bounded busy timeout.
- Add indexes for owner, category, publication/date, and relationship lookup queries.
- Use generated Prisma queries and bound raw-query parameters only where necessary.
  Whitelist sortable columns; never interpolate user-provided SQL fragments.
- Use transactions for ownership reassignment, deletion, administrative changes
  with audit events, and last-active-admin checks. Acquire SQLite's writer lock at
  the start of a Prisma interactive transaction before policy reads, so competing
  requests cannot bypass the last-admin check. Await all database operations.
- Keep existing millisecond INTEGER timestamps as Prisma BigInt values; convert
  explicitly when producing JSON or human-readable dates. Session JSON contains
  numeric user IDs/auth versions, never Prisma BigInt records.
- Start search with parameterized title/summary/tag matching and capped pagination.
  SQLite FTS5 can be added when catalog size and measured search needs justify it.
- Store Markdown as text. Require an explicit decision to delete or reassign owned
  skills before deleting a user; do not silently cascade-delete them.

## Authentication and Authorization

- Implement email/password registration and login using Argon2id and persistent sessions.
- Regenerate the session ID after login and revoke access on logout, suspension,
  and deletion. Use HttpOnly cookies, SameSite protections, and Secure cookies over HTTPS.
- Load the current user's status and role from SQLite on protected requests so
  account and permission changes take effect without relying on stale session roles.
- Verify email before publishing. Password reset and invitation tokens are random,
  hashed at rest, single-use, and time-limited; administrators never see passwords.
- Public registration always creates a regular user. Bootstrap the first admin
  using a server-side maintenance script; protect the last active admin.
- Middleware checks login and roles; services enforce ownership and permission
  rules for each read/mutation. Hidden navigation links are not authorization.
- Only published skills owned by active users are public. Drafts are owner/admin-only.
- Apply throttling to authentication endpoints. For the initial single-process
  deployment, document the limiter's restart behavior; use a shared persistent store
  if the deployment later runs multiple processes.

## EJS, Forms, and Content

- Use the **`ui-ux-pro-max` skill** when designing, building, reviewing, or refining
  the marketplace interface. Load it before UI/UX work on the landing page, skill
  list/detail pages, authentication forms, user panel, and admin panel.
- Apply its guidance to layout, typography, color, responsive behavior, accessibility,
  and interaction states using EJS, HTML, CSS, and vanilla TypeScript. Keep shared
  design patterns consistent through reusable EJS partials and CSS tokens.
- Use escaped EJS output (`<%= value %>`) for user-provided strings. Unescaped output
  (`<%- value %>`) is reserved for trusted partials and sanitized Markdown output.
- Disable raw HTML in Markdown; sanitize rendered markup, restrict URL schemes,
  and disallow embedded remote media initially. Never execute skill instructions.
- Return field-level validation errors while preserving safe entered values;
  do not repopulate passwords or tokens.
- Support search/filter/sort/page query parameters, clear empty states, 404 pages,
  error pages, success feedback, and confirmed destructive actions.
- Use semantic HTML, accessible labels, keyboard navigation, visible focus, and
  responsive CSS across public pages and both panels.
- Handle async errors centrally. Return generic production error pages and redact
  secrets, personal data, tokens, and skill bodies from logs.

## Phase 2 — SEO Engineering

Implement mission requirements SEO-01–03 with Express routes and reusable EJS
head metadata. Public content and metadata must be present in the initial HTML.

- Build absolute canonical and sharing URLs from validated `APP_URL`, not arbitrary
  request Host headers. Use skill titles/summaries safely with escaped EJS output;
  do not include account emails, tokens, or private content in metadata.
- Provide descriptive page-specific titles/descriptions, canonical links, Open Graph
  metadata, and Twitter card metadata for landing, catalog, and public skill details.
- Serve `/robots.txt` and `/sitemap.xml`. Generate sitemap entries from the same
  public-visibility predicate as discovery: published skills with active owners.
  Use actual update timestamps for lastmod and omit noncanonical query variants.
- Send noindex directives for auth/token pages, protected pages, unavailable/private
  skills, and errors. Exclude these from the sitemap. Private content remains
  protected by authorization; robots.txt and noindex are crawler instructions only.
- Specify normalized query/canonical rules before implementing catalog pagination:
  keep canonical paginated browse URLs distinct where their content differs,
  define noindex for arbitrary search/filter/sort variants, and preserve crawlable
  links to published skill details. Verify invalid pages return real 404 statuses.
- Check raw HTTP HTML, canonical URLs, metadata escaping, XML validity, sitemap
  visibility after publish/unpublish/suspension/deletion, and crawler directives.

## Phase 2 — Dark Theme Engineering

Implement mission requirements THEME-01–02 with shared CSS custom properties,
EJS partials, and a small browser TypeScript module. No UI framework is required.

- Define semantic theme tokens for backgrounds, surfaces, text, borders, links,
  focus rings, form states, and Markdown/code blocks; components consume these
  tokens so public pages and later creator/admin panels remain consistent.
- Provide an accessible Light/Dark/System selector in shared navigation. Default
  to `prefers-color-scheme`; persist explicit choices in browser storage, handle
  storage failures gracefully, and listen for system changes only in System mode.
- Apply the resolved theme before first paint with a minimal early initialization
  compatible with Helmet's Content Security Policy; avoid introducing unrestricted
  inline-script allowances. Set CSS `color-scheme` for native form controls.
- CSS system-preference fallback must keep both themes readable without JavaScript.
  Theme changes must not cause layout shifts or hide focus/validation feedback.
- Verify contrast in each theme (WCAG AA: 4.5:1 normal text, 3:1 large text and
  required UI/focus indicators), keyboard/screen-reader control labels, reload and
  navigation persistence, system changes, blocked storage, and narrow/wide layouts.

## Environment Configuration

Document these planned values in `.env.example` without real credentials:

```text
NODE_ENV
PORT
APP_URL
DATABASE_PATH
SESSION_SECRET
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
EMAIL_FROM
```

`DATABASE_PATH` remains the application's single source of truth. Runtime and
migration wrappers derive an absolute Prisma `DATABASE_URL` (`file:` URL) from it.
Direct Prisma CLI schema authoring requires setting the same absolute URL explicitly.

Keep separate database files for local development, staging, and production.
Use an absolute database path in production, stored outside the application release
directory so deployments cannot overwrite it.

## Planned Commands

Create and verify these scripts during foundation implementation:

| Purpose                  | Command                                                  |
| ------------------------ | -------------------------------------------------------- |
| Install dependencies     | `npm install`; `npm ci` for lockfile-based installation  |
| Local development        | `npm run dev`                                            |
| Type-check               | `npm run typecheck`                                      |
| Generate Prisma Client   | `npm run db:generate`                                    |
| Build server/browser     | `npm run build`                                          |
| Start application        | `npm start` after build                                  |
| Lint                     | `npm run lint`                                           |
| Apply/check formatting   | `npm run format` / `npm run format:check`                |
| Apply migrations         | `npm run db:migrate`                                     |
| Seed development catalog | `npm run db:seed` with an environment guard              |
| Bootstrap first admin    | `npm run admin:bootstrap` with server-side configuration |
| Create database backup   | `npm run db:backup` using the SQLite backup API          |

TypeScript uses strict NodeNext ES modules. Relative server imports retain `.js`
extensions for compiled Node output. `tsx` executes source during development;
`tsc` emits server code under `dist/src/` and browser code under `dist/client/`. EJS
templates remain in `src/views/`; run commands from the repository root. No frontend
framework/bundle is required. Rebuild browser code after editing `src/client/`.
Prisma Migrate deploys checked-in migrations; `db:migrate` baselines recognized
legacy databases before deployment without resetting data. Author future migrations
with `prisma migrate dev` against a disposable database and review SQL, including
SQLite CHECK constraints unsupported by the declarative Prisma schema. Never use
`db push` or `migrate reset` against retained data. Repeatable acceptance scenarios
and migration evidence live in F001's `validation.md`.

## Hosting and Operations

Hosting provider is **not selected**. The application requires a long-running Node.js
process and persistent local disk for SQLite. Plan the initial deployment as one
application instance with a local database rather than ephemeral serverless storage.

- Serve HTTPS through the selected environment and configure Express proxy trust
  to match the actual reverse proxy arrangement.
- Persist the SQLite database across releases; do not share its WAL files through
  an unsupported network filesystem or use independent replicas as one database.
- Apply migrations through a controlled maintenance step before starting the release.
- Back up the live database with SQLite's backup API or another SQLite-consistent
  method; copying only the main file while WAL writes are active is insufficient.
- Document retention, verify restoration, and keep backups outside the application host.
- Provide application health checks and inspect startup errors, database access,
  email delivery, and latency through application logs.
- Gracefully stop accepting requests on shutdown and close database connections.
- Document application rollback separately from database recovery.

## Verification and Decision Management

Manually verify public discovery, creator CRUD, admin user CRUD, and global skill
CRUD, including unauthorized requests, suspension, invitations, last-admin
protection, and transactional deletion/reassignment. Check keyboard accessibility,
responsive layouts, Markdown safety, backup restoration, and mission performance goals.

Record the Express/EJS architecture, SQLite persistence, authentication design,
and eventual hosting decision in ADRs. Keep the mission, roadmap, specifications,
and this stack aligned when choices change.
