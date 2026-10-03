import { loadConfig } from "./config/env.js";
import { openDatabase } from "./db/connection.js";
import { createSessionStore } from "./middleware/session.js";
import { createMailer } from "./services/email.js";
import { createApp } from "./app.js";

let db, sessions, mailer, server;
let stopping = false;
try {
  const config = loadConfig();
  db = openDatabase(config.DATABASE_PATH);
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name='users'").get())
    throw new Error("Database is not migrated. Run npm run db:migrate.");
  sessions = await createSessionStore(config.DATABASE_PATH);
  mailer = createMailer(config);
  server = createApp(config, db, sessions.store, mailer).listen(
    config.PORT,
    () =>
      console.info(JSON.stringify({ event: "listening", port: config.PORT })),
  );
  server.on("error", () => {
    console.error("HTTP listener failed. Check PORT availability.");
    shutdown(1);
  });
} catch (error) {
  console.error(
    error.message.startsWith("Invalid configuration:") ||
      error.message.startsWith("Production requires") ||
      error.message.startsWith("Database is not migrated")
      ? error.message
      : "Startup failed. Check database permissions and configuration.",
  );
  await shutdown(1);
}
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  const force = setTimeout(() => process.exit(1), 10000).unref();
  if (server) await new Promise((resolve) => server.close(resolve));
  mailer?.close();
  if (sessions) await sessions.close();
  db?.close();
  clearTimeout(force);
  process.exit(code);
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
