import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config/env.js";
import { openDatabase } from "../src/db/connection.js";
import { accounts } from "../src/repositories/accounts.js";
import { hashPassword } from "../src/services/auth.js";
import { email, password } from "../src/validators/auth.js";

export async function bootstrap(db, input) {
  if (
    input.BOOTSTRAP_ENABLED !== "true" ||
    input.BOOTSTRAP_EMAIL_VERIFIED !== "true"
  )
    throw new Error(
      "Bootstrap requires BOOTSTRAP_ENABLED=true and attested BOOTSTRAP_EMAIL_VERIFIED=true.",
    );
  const address = email.parse(input.BOOTSTRAP_EMAIL);
  const repo = accounts(db);
  const existing = repo.byEmail(address);
  const hash = existing
    ? null
    : await hashPassword(password.parse(input.BOOTSTRAP_PASSWORD));
  const name = input.BOOTSTRAP_NAME?.trim();
  if (!existing && (!name || name.length > 80))
    throw new Error("Set BOOTSTRAP_NAME (1–80 characters).");
  return db
    .transaction(() => {
      let user = repo.byEmail(address);
      if (user && user.status !== "active")
        throw new Error(
          "Bootstrap does not reactivate invited/suspended accounts.",
        );
      if (user?.role === "admin" && user.verified_at) return user.id;
      if (!user) {
        if (!hash)
          throw new Error(
            "Account changed during bootstrap. Retry with protected credentials.",
          );
        user = repo.byId(repo.create(address, name, hash));
      }
      db.prepare(
        "UPDATE users SET role='admin',verified_at=COALESCE(verified_at,?),updated_at=? WHERE id=?",
      ).run(Date.now(), Date.now(), user.id);
      repo.audit(
        null,
        "admin_bootstrapped",
        user.id,
        "Operator attested email ownership",
      );
      return user.id;
    })
    .immediate();
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDatabase(loadConfig().DATABASE_PATH);
  try {
    await bootstrap(db, process.env);
    console.info("Administrator bootstrap complete.");
  } catch {
    console.error(
      "Bootstrap failed. Check protected bootstrap configuration and account state.",
    );
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
