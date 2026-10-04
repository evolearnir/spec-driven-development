import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import {
  openDatabase,
  timestamp,
  writeTransaction,
  type Database,
} from "./connection.js";
import { hashPassword } from "../services/auth.js";
import { randomBytes } from "node:crypto";
import { seedMarketplace } from "./seed-marketplace.js";

export async function seed(db: Database) {
  const hash = await hashPassword(randomBytes(24).toString("hex"));
  await writeTransaction(db, async (tx) => {
    for (const [name, role, status, verified] of [
      ["A", "user", "active", false],
      ["B", "user", "active", true],
      ["C", "user", "suspended", true],
      ["D", "user", "invited", false],
      ["E", "admin", "active", true],
      ["F", "admin", "active", true],
    ] as const) {
      const email = `${name.toLowerCase()}@fixtures.example.test`;
      if (await tx.user.findUnique({ where: { email } })) continue;
      const user = await tx.user.create({
        data: {
          email,
          display_name: `Fixture ${name}`,
          role,
          status,
          verified_at: verified ? timestamp() : null,
          password_hash: status === "invited" ? null : hash,
          created_at: timestamp(),
          updated_at: timestamp(),
        },
      });
      if (["A", "B"].includes(name))
        for (const state of ["draft", "published"]) {
          await tx.skill.create({
            data: {
              slug: `fixture-${name.toLowerCase()}-${state}`,
              title: `Fixture ${name}`,
              summary: "Summary",
              description: "Description",
              body: "# Instructions",
              usage_instructions: "Paste instructions",
              owner_id: user.id,
              category_id: 1,
              version_label: "1.0",
              license: "MIT",
              status: state,
              created_at: timestamp(),
              updated_at: timestamp(),
              tools: { create: { tool_id: 1 } },
            },
          });
        }
    }
  });
  await seedMarketplace(db, hash);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  if (config.NODE_ENV !== "development" || process.env.SEED_ENABLED !== "true")
    throw new Error(
      "Fixtures require NODE_ENV=development and SEED_ENABLED=true.",
    );
  const db = await openDatabase(config.DATABASE_PATH);
  try {
    await seed(db);
    console.info(
      "Development fixtures created with unknown random passwords. Use bootstrap for an explicit operator account.",
    );
  } finally {
    await db.$disconnect();
  }
}
