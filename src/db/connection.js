import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export function openDatabase(filename) {
  if (filename !== ":memory:")
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}
