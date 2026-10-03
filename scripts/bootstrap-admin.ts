import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config/env.js";
import {
  openDatabase,
  timestamp,
  writeTransaction,
  type Database,
} from "../src/db/connection.js";
import { accounts } from "../src/repositories/accounts.js";
import { hashPassword } from "../src/services/auth.js";
import { email, password } from "../src/validators/auth.js";

export async function bootstrap(
  db: Database,
  input: Record<string, string | undefined>,
) {
  if (
    input.BOOTSTRAP_ENABLED !== "true" ||
    input.BOOTSTRAP_EMAIL_VERIFIED !== "true"
  )
    throw new Error(
      "Bootstrap requires BOOTSTRAP_ENABLED=true and attested BOOTSTRAP_EMAIL_VERIFIED=true.",
    );
  const address = email.parse(input.BOOTSTRAP_EMAIL);
  const existing = await accounts(db).byEmail(address);
  const hash = existing
    ? null
    : await hashPassword(password.parse(input.BOOTSTRAP_PASSWORD));
  const name = input.BOOTSTRAP_NAME?.trim();
  if (!existing && (!name || name.length > 80))
    throw new Error("Set BOOTSTRAP_NAME (1–80 characters).");
  return writeTransaction(db, async (tx) => {
    const repo = accounts(tx);
    let user = await repo.byEmail(address);
    if (user && user.status !== "active")
      throw new Error(
        "Bootstrap does not reactivate invited/suspended accounts.",
      );
    if (user?.role === "admin" && user.verified_at) return user.id;
    if (!user) {
      if (!hash || !name)
        throw new Error(
          "Account changed during bootstrap. Retry with protected credentials.",
        );
      user = await repo.create(address, name, hash);
    }
    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "admin",
        verified_at: user.verified_at ?? timestamp(),
        updated_at: timestamp(),
      },
    });
    await repo.audit(
      null,
      "admin_bootstrapped",
      user.id,
      "Operator attested email ownership",
    );
    return user.id;
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = await openDatabase(loadConfig().DATABASE_PATH);
  try {
    await bootstrap(db, process.env);
    console.info("Administrator bootstrap complete.");
  } catch {
    console.error(
      "Bootstrap failed. Check protected bootstrap configuration and account state.",
    );
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
