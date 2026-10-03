import session from "express-session";
import connectSqlite from "connect-sqlite3";
import sqlite3 from "sqlite3";

export function ensureSessionSchema(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS sessions (sid PRIMARY KEY, expired, sess)",
  );
}
export async function createSessionStore(filename) {
  const client = new sqlite3.Database(filename);
  await new Promise((resolve, reject) =>
    client.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
      (e) => (e ? reject(e) : resolve()),
    ),
  );
  const SQLiteStore = connectSqlite(session);
  const store = new SQLiteStore({ db: client });
  await new Promise((resolve) => store.client.once("connect", resolve));
  return {
    store,
    close: () =>
      new Promise((resolve, reject) =>
        client.close((e) => (e ? reject(e) : resolve())),
      ),
  };
}
export function sessionMiddleware(config, store) {
  return session({
    name: "skillmart.sid",
    secret: config.SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.secureCookies,
      maxAge: 7 * 86400000,
    },
  });
}
