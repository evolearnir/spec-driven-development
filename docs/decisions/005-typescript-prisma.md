# ADR 005 — TypeScript and Prisma replanning

Accepted 2026-10-03 through the requesting product owner's direct instruction to
change the constitution, technology stack, and code to TypeScript and Prisma ORM.
Supersedes the language/repository/migration/session choices in ADRs 001–002.

## Decision

- Author server, browser, and maintenance source in strict TypeScript; use NodeNext
  ES modules, tsx for development, and tsc for production/browser output.
- Keep Node.js 24, Express 5, EJS, SQLite, Zod, and existing product/auth policies.
- Use Prisma Client 6.19 for asynchronous application queries and Prisma Migrate
  for checked-in schema history. Prisma 6 is pinned as a compatible native SQLite
  client; major-version upgrades require a separate compatibility review.
- Model existing table/column names and millisecond timestamps without destructive
  conversion. A follow-up migration preserves values while declaring timestamp
  columns BIGINT, which Prisma needs to decode 64-bit milliseconds correctly.
- Store express-session payloads using Prisma in the existing sessions table;
  password reset/lifecycle transactions revoke those records directly.
- Acquire a SQLite writer lock before policy reads in Prisma write transactions
  to serialize final-admin checks, token consumption, mutations, and audit events.
- Retain better-sqlite3 solely for recognizing legacy migration history and SQLite's
  online backup API. Application repositories do not use that driver.

## Migration and consequences

The migration wrapper derives an absolute Prisma file URL from DATABASE_PATH.
Fresh databases deploy the foundation migration. A database with recorded
001-foundation.sql history and no Prisma history is baselined using migrate resolve
before deploy; users, token hashes, skills, audits, and existing sessions survive.
Back up retained data before running this operation. No automatic reset occurs.

Prisma schema does not describe SQLite CHECK constraints; review and retain these
in migration SQL. All callers must await Prisma queries, including middleware,
controllers, bootstrap, cleanup, and acceptance checks. Build output is ignored.
Type-check, build, lint, format, disposable HTTP/service checks, concurrent independent
worker transactions, legacy adoption, and backup restoration form the local gate.
Historical JavaScript validation remains evidence for its revision only; browser,
SMTP, HTTPS staging, and owner release acceptance are separately verified.
