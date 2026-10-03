import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import Sqlite from "better-sqlite3";
import { databaseUrl } from "./connection.js";
import { loadConfig } from "../config/env.js";

const require = createRequire(import.meta.url);
export async function prismaCommand(filename: string, args: string[]) {
  const cli = require.resolve("prisma/build/index.js");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      env: { ...process.env, DATABASE_URL: databaseUrl(filename) },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Prisma migration command failed (${code}).`)),
    );
  });
}
export async function migrate(filename: string) {
  fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const legacy = new Sqlite(filename);
  let baseline = false;
  try {
    const hasHistory = legacy
      .prepare("SELECT 1 FROM sqlite_master WHERE name='_prisma_migrations'")
      .get();
    const hasUsers = legacy
      .prepare("SELECT 1 FROM sqlite_master WHERE name='users'")
      .get();
    if (hasUsers && !hasHistory) {
      const hasLegacyHistory = legacy
        .prepare("SELECT 1 FROM sqlite_master WHERE name='schema_migrations'")
        .get();
      if (
        !hasLegacyHistory ||
        !legacy
          .prepare(
            "SELECT 1 FROM schema_migrations WHERE name='001-foundation.sql'",
          )
          .get()
      )
        throw new Error(
          "Unrecognized existing database; baseline requires the recorded foundation migration.",
        );
      // The old store may not have started yet. Preserve existing session rows.
      legacy.exec(
        "CREATE TABLE IF NOT EXISTS sessions (sid TEXT NOT NULL PRIMARY KEY, expired INTEGER NOT NULL, sess TEXT NOT NULL)",
      );
      baseline = true;
    }
  } finally {
    legacy.close();
  }
  if (baseline)
    await prismaCommand(filename, [
      "migrate",
      "resolve",
      "--applied",
      "20261003000000_foundation",
    ]);
  await prismaCommand(filename, ["migrate", "deploy"]);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate(loadConfig().DATABASE_PATH);
}
