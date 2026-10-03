import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config/env.js";
import Sqlite from "better-sqlite3";

export async function backup(filename: string, directory: string) {
  fs.mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, `skillmart-${Date.now()}.sqlite`);
  const db = new Sqlite(filename, { readonly: true });
  try {
    await db.backup(destination);
  } finally {
    db.close();
  }
  return destination;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  await backup(config.DATABASE_PATH, config.BACKUP_DIR);
  console.info("Consistent backup complete.");
}
