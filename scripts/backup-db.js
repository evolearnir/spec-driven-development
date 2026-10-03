import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config/env.js";
import { openDatabase } from "../src/db/connection.js";

export async function backup(db, directory) {
  fs.mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, `skillmart-${Date.now()}.sqlite`);
  await db.backup(destination);
  return destination;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const db = openDatabase(config.DATABASE_PATH);
  try {
    await backup(db, config.BACKUP_DIR);
    console.info("Consistent backup complete.");
  } finally {
    db.close();
  }
}
