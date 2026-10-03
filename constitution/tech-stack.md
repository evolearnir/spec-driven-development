# AI Skill Market — Technology Stack

Status: Approved foundation stack; implementation tracked by F001. Hosting deferred per ADR 004.
Governed by: [Mission and Constitution](mission.md), version 0.4.1.

## Architecture

Build a server-rendered web application using **Node.js, Express.js, EJS, and SQLite**.
The landing page, public skill catalog, user panel, and admin panel share one
application. Express handles routing and request processing; EJS renders HTML;
SQLite stores users, skills, sessions, and administrative audit records.

Use a straightforward routes/controllers/services/repositories structure. Forms
submit to Express endpoints, and successful mutations redirect to a result page.
Small client-side JavaScript modules handle interactions such as copying skill
content and confirmation dialogs.

## Frameworks and Libraries

| Area               | Technology                                                     | Purpose                                                                                   |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Language           | JavaScript, ES modules                                         | One language for server code and browser interactions.                                    |
| Runtime            | Node.js 24 LTS                                                 | Runs the Express application and maintenance scripts.                                     |
| Web framework      | Express.js 5                                                   | Routing, middleware, form handling, and HTTP responses.                                   |
| Template engine    | EJS                                                            | Server-rendered HTML pages and reusable partials.                                         |
| Frontend           | HTML, CSS, vanilla JavaScript                                  | Responsive pages and lightweight interactions.                                            |
| Database           | SQLite                                                         | File-based relational persistence with no separate database server.                       |
| Database driver    | better-sqlite3                                                 | Prepared SQL statements and transactions.                                                 |
| Schema migrations  | Numbered SQL files plus a Node.js migration runner             | Track and apply schema changes in order.                                                  |
| Sessions           | express-session + a maintained SQLite-compatible session store | Persistent server-side login sessions; choose and pin the store during setup.             |
| Password hashing   | argon2, using Argon2id                                         | Secure password storage and verification.                                                 |
| Validation         | Zod                                                            | Validate form fields and query parameters on the server.                                  |
| Markdown rendering | markdown-it + sanitize-html                                    | Render skill instructions with raw HTML disabled and sanitize generated markup.           |
| HTTP protections   | Helmet + express-rate-limit + synchronizer                     | Response headers, auth throttling, and session-backed CSRF tokens for form submissions.   |
| Email              | Nodemailer                                                     | Send verification, password recovery, and invitation emails through configured SMTP.      |
| Configuration      | dotenv                                                         | Load local environment variables; use deployment environment configuration in production. |
| Logging            | Built-in console logging with structured fields                | Record application errors and operational events with sensitive values redacted.          |
| Code quality       | ESLint + Prettier                                              | Lint and format JavaScript, templates, and styles.                                        |
| Package manager    | npm                                                            | Dependency scripts and reproducible installation through `package-lock.json`.             |
| Development reload | nodemon                                                        | Restart the application when server files change.                                         |

Compatible versions are pinned in package.json and package-lock.json, with Node.js
24 declared. Foundation commands are implemented and locally checked; later-phase
Markdown/discovery/CRUD behavior remains planned. Sessions use connect-sqlite3
0.9.18 with sqlite3 6.0.1; CSRF uses csrf-sync's synchronizer-token implementation.
The package named synchronizer is unrelated and is not installed. Nodemon uses
chokidar 4.0.3 through a compatibility override to avoid vulnerable older braces.

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
  app.js                         # Configure Express, middleware, and routers
  server.js                      # Start HTTP server and handle shutdown
  config/
  routes/
    public.routes.js
    auth.routes.js
    dashboard.routes.js
    admin.routes.js
  controllers/
  services/                      # Authentication and marketplace business rules
  repositories/                  # Prepared SQL queries and persistence
  middleware/                    # Session, role, status, ownership, CSRF, errors
  validators/
  db/
    connection.js
    migrations/
    migrate.js
    seed.js
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
  js/
  images/
scripts/
  bootstrap-admin.js
  backup-db.js
data/                            # Local database files; ignored by Git
constitution/
  features/                        # F001 package uses specification/implementation/validation.md
docs/decisions/
.env.example
```

Only `public/` is served as static content. Database files, application source,
configuration, and private data must never be exposed through static routes.

## SQLite Data Model

| Table                                   | Main fields / constraints                                                                                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| users                                   | ID, unique normalized email, display name, password hash, role (`user`/`admin`), status (`invited`/`active`/`suspended`), verification timestamp, timestamps. Invited accounts have no password until setup completes. |
| sessions                                | Session-store-managed records and expiry; keep the store's schema separate from application migrations when required.                                                                                                  |
| auth_tokens                             | User reference, purpose (verification/reset/invitation), token hash, expiry, used timestamp.                                                                                                                           |
| skills                                  | ID, unique slug, title, summary, description, Markdown body, usage instructions, owner ID, category ID, version label, license, draft/published status, featured flag, timestamps.                                     |
| categories                              | ID, unique slug, name.                                                                                                                                                                                                 |
| tags / skill_tags                       | Normalized tags and skill/tag relationships.                                                                                                                                                                           |
| supported_tools / skill_supported_tools | Tool names and creator-declared compatibility relationships.                                                                                                                                                           |
| skill_links                             | Skill reference, link type, validated HTTP(S) URL.                                                                                                                                                                     |
| audit_events                            | Nullable actor reference, action, target type/ID, non-sensitive change summary, timestamp.                                                                                                                             |
| schema_migrations                       | Applied migration identifier and application timestamp.                                                                                                                                                                |

- Enable foreign keys on every connection, WAL mode, and a bounded busy timeout.
- Add indexes for owner, category, publication/date, and relationship lookup queries.
- Use prepared statements with bound parameters. Whitelist sortable columns; never
  interpolate user-provided SQL fragments.
- Use transactions for ownership reassignment, deletion, administrative changes
  with audit events, and last-active-admin checks. Use an immediate write transaction
  for the last-admin check and mutation so competing requests cannot bypass it.
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
  and interaction states using EJS, HTML, CSS, and vanilla JavaScript. Keep shared
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

Keep separate database files for local development, staging, and production.
Use an absolute database path in production, stored outside the application release
directory so deployments cannot overwrite it.

## Planned Commands

Create and verify these scripts during foundation implementation:

| Purpose                  | Command                                                  |
| ------------------------ | -------------------------------------------------------- |
| Install dependencies     | `npm install`; `npm ci` for lockfile-based installation  |
| Local development        | `npm run dev`                                            |
| Start application        | `npm start`                                              |
| Lint                     | `npm run lint`                                           |
| Apply/check formatting   | `npm run format` / `npm run format:check`                |
| Apply migrations         | `npm run db:migrate`                                     |
| Seed development catalog | `npm run db:seed` with an environment guard              |
| Bootstrap first admin    | `npm run admin:bootstrap` with server-side configuration |
| Create database backup   | `npm run db:backup` using the SQLite backup API          |

JavaScript and EJS run directly on Node.js; this baseline needs no frontend bundle
or TypeScript compilation. Acceptance verification uses repeatable manual scenarios
recorded in each feature's `verification.md`.

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
