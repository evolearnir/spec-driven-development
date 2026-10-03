import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { openDatabase } from "./connection.js";
import { loadConfig } from "../config/env.js";

export function migrate(
  db,
  directory = fileURLToPath(new URL("./migrations/", import.meta.url)),
) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
  );
  for (const name of fs
    .readdirSync(directory)
    .filter((n) => /^\d+.*\.sql$/.test(n))
    .sort()) {
    db.transaction(() => {
      if (db.prepare("SELECT 1 FROM schema_migrations WHERE name=?").get(name))
        return;
      db.exec(fs.readFileSync(path.join(directory, name), "utf8"));
      db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run(
        name,
        Date.now(),
      );
    }).immediate();
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDatabase(loadConfig().DATABASE_PATH);
  try {
    migrate(db);
    console.info("Migrations complete.");
  } finally {
    db.close();
  }
}
