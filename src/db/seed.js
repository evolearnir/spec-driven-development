import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import { openDatabase } from "./connection.js";
import { ensureSessionSchema } from "../middleware/session.js";
import { accounts } from "../repositories/accounts.js";
import { hashPassword } from "../services/auth.js";
import { randomBytes } from "node:crypto";

export async function seed(db) {
  ensureSessionSchema(db);
  const repo = accounts(db);
  const hash = await hashPassword(randomBytes(24).toString("hex"));
  db.transaction(() => {
    for (const [name, role, status, verified] of [
      ["A", "user", "active", false],
      ["B", "user", "active", true],
      ["C", "user", "suspended", true],
      ["D", "user", "invited", false],
      ["E", "admin", "active", true],
      ["F", "admin", "active", true],
    ]) {
      const address = `${name.toLowerCase()}@fixtures.example.test`;
      if (repo.byEmail(address)) continue;
      const id = repo.create(address, `Fixture ${name}`, hash);
      db.prepare(
        "UPDATE users SET role=?,status=?,verified_at=?,password_hash=? WHERE id=?",
      ).run(
        role,
        status,
        verified ? Date.now() : null,
        status === "invited" ? null : hash,
        id,
      );
      if (["A", "B"].includes(name))
        for (const state of ["draft", "published"]) {
          const skillId = Number(
            db
              .prepare(
                "INSERT INTO skills(slug,title,summary,description,body,usage_instructions,owner_id,category_id,version_label,license,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?)",
              )
              .run(
                `fixture-${name.toLowerCase()}-${state}`,
                `Fixture ${name}`,
                "Summary",
                "Description",
                "# Instructions",
                "Paste instructions",
                id,
                "1.0",
                "MIT",
                state,
                Date.now(),
                Date.now(),
              ).lastInsertRowid,
          );
          db.prepare("INSERT INTO skill_supported_tools VALUES (?,1)").run(
            skillId,
          );
        }
    }
  }).immediate();
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  if (config.NODE_ENV !== "development" || process.env.SEED_ENABLED !== "true")
    throw new Error(
      "Fixtures require NODE_ENV=development and SEED_ENABLED=true.",
    );
  const db = openDatabase(config.DATABASE_PATH);
  try {
    await seed(db);
    console.info(
      "Development fixtures created with unknown random passwords. Use bootstrap for an explicit operator account.",
    );
  } finally {
    db.close();
  }
}
