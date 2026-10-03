import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config/env.js";
import { openDatabase } from "../src/db/connection.js";

export function cleanup(db, backupDir, now = Date.now()) {
  db.transaction(() => {
    db.prepare("DELETE FROM auth_tokens WHERE expires_at<=? OR used_at<=?").run(
      now,
      now - 7 * 86400000,
    );
    db.prepare("DELETE FROM audit_events WHERE created_at<=?").run(
      now - 90 * 86400000,
    );
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='sessions'").get())
      db.prepare("DELETE FROM sessions WHERE expired<=?").run(now);
  }).immediate();
  if (fs.existsSync(backupDir))
    for (const name of fs.readdirSync(backupDir)) {
      if (
        /^skillmart-\d+\.sqlite$/.test(name) &&
        Number(name.match(/\d+/)[0]) <= now - 7 * 86400000
      )
        fs.unlinkSync(path.join(backupDir, name));
    }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const db = openDatabase(config.DATABASE_PATH);
  try {
    cleanup(db, config.BACKUP_DIR);
    console.info("Retention cleanup complete.");
  } finally {
    db.close();
  }
}
