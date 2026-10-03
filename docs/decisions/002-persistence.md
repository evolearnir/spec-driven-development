# ADR 002 — SQLite and persistent sessions

Accepted 2026-10-03. Use better-sqlite3 with foreign keys, WAL, and a 5-second
busy timeout. Numbered migrations and their history inserts are atomic.
Use express-session with connect-sqlite3 0.9.18 (updated August 2026), pinned in
the lockfile, and sqlite3 6.0.1 overriding the adapter's outdated optional driver.
The adapter owns its session schema, checks expiration on reads, and cleans
expired rows at startup and daily. Application cleanup also removes expired rows.
Its separate connection uses WAL, foreign keys, and a 5-second busy timeout.
Sessions live in the same database, enabling transactional user-session revocation.
Immediate transactions serialize final-admin checks, account changes, and audit writes.
SQLite limits deployment to one instance on local persistent disk.

Daily maintenance removes expired tokens/sessions, consumed tokens older than
7 days, audit events older than 90 days, and backup files older than 7 days.
Daily consistent backups use the SQLite backup API. Account deletion immediately
removes personal data and tokens/sessions; backup copies age out within 7 days.
