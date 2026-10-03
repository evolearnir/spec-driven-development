import { loadConfig } from "./config/env.js";
import { openDatabase } from "./db/connection.js";
import { createSessionStore } from "./middleware/session.js";
import { createMailer } from "./services/email.js";
import { createApp } from "./app.js";
import type { Database } from "./db/connection.js";
import type { Server } from "node:http";

let db: Database | undefined;
let sessions: Awaited<ReturnType<typeof createSessionStore>> | undefined;
let mailer: ReturnType<typeof createMailer> | undefined;
let server: Server | undefined;
let stopping = false;
try {
  const config = loadConfig();
  db = await openDatabase(config.DATABASE_PATH);
  const tables = await db.$queryRaw<
    { name: string }[]
  >`SELECT name FROM sqlite_master WHERE name='users'`;
  if (!tables.length)
    throw new Error("Database is not migrated. Run npm run db:migrate.");
  sessions = await createSessionStore(db);
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
  const message = error instanceof Error ? error.message : "";
  console.error(
    message.startsWith("Invalid configuration:") ||
      message.startsWith("Production requires") ||
      message.startsWith("Database is not migrated")
      ? message
      : "Startup failed. Check database permissions and configuration.",
  );
  await shutdown(1);
}
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  const force = setTimeout(() => process.exit(1), 10000).unref();
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  mailer?.close();
  if (sessions) await sessions.close();
  await db?.$disconnect();
  clearTimeout(force);
  process.exit(code);
}
process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
