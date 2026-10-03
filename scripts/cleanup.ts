import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config/env.js";
import {
  openDatabase,
  writeTransaction,
  type Database,
} from "../src/db/connection.js";

export async function cleanup(
  db: Database,
  backupDir: string,
  now = Date.now(),
) {
  await writeTransaction(db, async (tx) => {
    await tx.authToken.deleteMany({
      where: {
        OR: [
          { expires_at: { lte: BigInt(now) } },
          { used_at: { lte: BigInt(now - 7 * 86400000) } },
        ],
      },
    });
    await tx.auditEvent.deleteMany({
      where: { created_at: { lte: BigInt(now - 90 * 86400000) } },
    });
    await tx.session.deleteMany({ where: { expired: { lte: BigInt(now) } } });
  });
  if (fs.existsSync(backupDir))
    for (const name of fs.readdirSync(backupDir)) {
      if (
        /^skillmart-\d+\.sqlite$/.test(name) &&
        Number(name.match(/\d+/)?.[0]) <= now - 7 * 86400000
      )
        fs.unlinkSync(path.join(backupDir, name));
    }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const db = await openDatabase(config.DATABASE_PATH);
  try {
    await cleanup(db, config.BACKUP_DIR);
    console.info("Retention cleanup complete.");
  } finally {
    await db.$disconnect();
  }
}
