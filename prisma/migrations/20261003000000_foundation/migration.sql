BEGIN TRANSACTION;
CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE sessions (sid TEXT NOT NULL PRIMARY KEY, expired INTEGER NOT NULL, sess TEXT NOT NULL);
CREATE TABLE users (
 id INTEGER PRIMARY KEY,
 email TEXT NOT NULL UNIQUE CHECK(email = lower(trim(email))),
 display_name TEXT NOT NULL,
 password_hash TEXT,
 role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('invited','active','suspended')),
 verified_at INTEGER,
 auth_version INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 CHECK(status = 'invited' OR password_hash IS NOT NULL)
);
CREATE TABLE auth_tokens (
 id INTEGER PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verification','reset','invitation')),
 token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL,
 used_at INTEGER
);
CREATE INDEX auth_tokens_user ON auth_tokens(user_id,purpose);
CREATE TABLE categories (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK(name = lower(trim(name))));
CREATE TABLE supported_tools (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE skills (
 id INTEGER PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE CHECK(slug = lower(trim(slug)) AND length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'),
 title TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL DEFAULT '', usage_instructions TEXT NOT NULL DEFAULT '',
 owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 category_id INTEGER REFERENCES categories(id),
 version_label TEXT NOT NULL DEFAULT '', license TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX skills_owner ON skills(owner_id);
CREATE INDEX skills_category ON skills(category_id);
CREATE INDEX skills_publication ON skills(status,created_at);
CREATE TABLE skill_tags (
 skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
 tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
 PRIMARY KEY(skill_id,tag_id)
);
CREATE INDEX skill_tags_tag ON skill_tags(tag_id);
CREATE TABLE skill_supported_tools (
 skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
 tool_id INTEGER NOT NULL REFERENCES supported_tools(id) ON DELETE CASCADE,
 PRIMARY KEY(skill_id,tool_id)
);
CREATE INDEX skill_tools_tool ON skill_supported_tools(tool_id);
CREATE TABLE skill_links (
 id INTEGER PRIMARY KEY, skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
 type TEXT NOT NULL CHECK(type IN ('source','documentation')),
 url TEXT NOT NULL CHECK(url LIKE 'https://%' OR url LIKE 'http://%')
);
CREATE INDEX skill_links_skill ON skill_links(skill_id);
CREATE TABLE audit_events (
 id INTEGER PRIMARY KEY,
 actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 action TEXT NOT NULL, target_type TEXT NOT NULL, target_id INTEGER NOT NULL,
 summary TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX audit_events_date ON audit_events(created_at);
INSERT INTO categories(slug,name) VALUES ('development','Development'),('writing','Writing'),('research','Research'),('productivity','Productivity'),('design','Design');
INSERT INTO supported_tools(name) VALUES ('Claude'),('ChatGPT'),('Gemini'),('Other');
COMMIT;
