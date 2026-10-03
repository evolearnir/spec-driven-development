-- SQLite INTEGER and BIGINT both store 64-bit integers, but Prisma's native
-- connector uses the declared type when decoding large millisecond timestamps.
-- Rebuild timestamp-bearing tables without changing values or relationships.
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE new_users (
 id INTEGER PRIMARY KEY,
 email TEXT NOT NULL UNIQUE CHECK(email = lower(trim(email))),
 display_name TEXT NOT NULL,
 password_hash TEXT,
 role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('invited','active','suspended')),
 verified_at BIGINT,
 auth_version INTEGER NOT NULL DEFAULT 0,
 created_at BIGINT NOT NULL,
 updated_at BIGINT NOT NULL,
 CHECK(status = 'invited' OR password_hash IS NOT NULL)
);
INSERT INTO new_users SELECT * FROM users;
DROP TABLE users;
ALTER TABLE new_users RENAME TO users;

CREATE TABLE new_auth_tokens (
 id INTEGER PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verification','reset','invitation')),
 token_hash TEXT NOT NULL UNIQUE,
 expires_at BIGINT NOT NULL,
 used_at BIGINT
);
INSERT INTO new_auth_tokens SELECT * FROM auth_tokens;
DROP TABLE auth_tokens;
ALTER TABLE new_auth_tokens RENAME TO auth_tokens;
CREATE INDEX auth_tokens_user ON auth_tokens(user_id,purpose);

CREATE TABLE new_skills (
 id INTEGER PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE CHECK(slug = lower(trim(slug)) AND length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'),
 title TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL DEFAULT '', usage_instructions TEXT NOT NULL DEFAULT '',
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 category_id INTEGER REFERENCES categories(id),
 version_label TEXT NOT NULL DEFAULT '', license TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
 created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL
);
INSERT INTO new_skills SELECT * FROM skills;
DROP TABLE skills;
ALTER TABLE new_skills RENAME TO skills;
CREATE INDEX skills_owner ON skills(owner_id);
CREATE INDEX skills_category ON skills(category_id);
CREATE INDEX skills_publication ON skills(status,created_at);

CREATE TABLE new_audit_events (
 id INTEGER PRIMARY KEY,
 actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 action TEXT NOT NULL, target_type TEXT NOT NULL, target_id INTEGER NOT NULL,
 summary TEXT NOT NULL, created_at BIGINT NOT NULL
);
INSERT INTO new_audit_events SELECT * FROM audit_events;
DROP TABLE audit_events;
ALTER TABLE new_audit_events RENAME TO audit_events;
CREATE INDEX audit_events_date ON audit_events(created_at);

CREATE TABLE new_sessions (sid TEXT NOT NULL PRIMARY KEY, expired BIGINT NOT NULL, sess TEXT NOT NULL);
INSERT INTO new_sessions SELECT * FROM sessions;
DROP TABLE sessions;
ALTER TABLE new_sessions RENAME TO sessions;

CREATE TABLE new_schema_migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL);
INSERT INTO new_schema_migrations SELECT * FROM schema_migrations;
DROP TABLE schema_migrations;
ALTER TABLE new_schema_migrations RENAME TO schema_migrations;

COMMIT;
PRAGMA foreign_keys=ON;
