// Disposable acceptance checks: no live configuration, SMTP, or token output.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { Worker } from "node:worker_threads";
import { randomBytes } from "node:crypto";
import type { Server } from "node:http";
import { createServer, type AddressInfo } from "node:net";
import Sqlite from "better-sqlite3";
import argon2 from "argon2";
import { openDatabase, timestamp } from "../src/db/connection.js";
import { migrate } from "../src/db/migrate.js";
import { createSessionStore } from "../src/middleware/session.js";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { authService, hashToken } from "../src/services/auth.js";
import { accounts } from "../src/repositories/accounts.js";
import { policies } from "../src/services/policies.js";
import { AppError } from "../src/services/errors.js";
import { seed } from "../src/db/seed.js";
import { bootstrap } from "./bootstrap-admin.js";
import { backup } from "./backup-db.js";
import { cleanup } from "./cleanup.js";
import {
  createMailer,
  type Mailer,
  type TokenPurpose,
} from "../src/services/email.js";

const tempRoot =
  process.platform === "win32"
    ? path.join(os.tmpdir(), "opencode")
    : os.tmpdir();
const directory = fs.mkdtempSync(path.join(tempRoot, "skillmart-check-"));
const filename = path.join(directory, "app.sqlite");
const config = loadConfig({
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_PATH: filename,
  SESSION_SECRET: randomBytes(48).toString("hex"),
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  EMAIL_FROM: "noreply@example.test",
});
const password = randomBytes(24).toString("hex");
const messages: { id: number; purpose: TokenPurpose; token: string }[] = [];
let failDelivery = false;
const mailer: Mailer = {
  async send(user, purpose, token) {
    if (failDelivery) throw new Error("Simulated delivery failure");
    messages.push({ id: user.id, purpose, token });
  },
};
const report = (message: string) => console.info(`PASS ${message}`);
let db: Awaited<ReturnType<typeof openDatabase>> | undefined;
let originalClient: Awaited<ReturnType<typeof openDatabase>> | undefined;
let server: Server | undefined;
const close = (server: Server) =>
  new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
try {
  const developmentMailer = createMailer({
    ...config,
    NODE_ENV: "development",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: 1,
  });
  const productionMailer = createMailer({
    ...config,
    NODE_ENV: "production",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: 1,
  });
  const terminal: string[] = [];
  const info = console.info;
  try {
    console.info = (message: string) => {
      terminal.push(message);
    };
    const token = randomBytes(32).toString("hex");
    await developmentMailer.send(
      { email: "fixture@example.test" },
      "verification",
      token,
    );
    assert.equal(terminal.length, 2);
    assert(terminal.every((line) => line.includes(token)));
    terminal.length = 0;
    await assert.rejects(
      productionMailer.send(
        { email: "fixture@example.test" },
        "verification",
        token,
      ),
    );
    await assert.rejects(
      developmentMailer.send({ email: "fixture@example.test" }, "reset", token),
    );
    assert.equal(terminal.length, 0);
  } finally {
    console.info = info;
    developmentMailer.close();
    productionMailer.close();
  }
  report("Development-only verification output; SMTP/recovery log boundaries");
  assert.throws(() => loadConfig({}), /Invalid configuration/);
  await migrate(filename);
  await migrate(filename);
  db = await openDatabase(filename);
  const client = db;
  originalClient = client;
  assert.equal(
    (await client.$queryRaw<{ foreign_keys: bigint }[]>`PRAGMA foreign_keys`)[0]
      .foreign_keys,
    1n,
  );
  assert.equal(
    (await client.$queryRaw<{ journal_mode: string }[]>`PRAGMA journal_mode`)[0]
      .journal_mode,
    "wal",
  );
  assert.equal(
    (
      await client.$queryRaw<
        { n: bigint }[]
      >`SELECT count(*) AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL`
    )[0].n,
    2n,
  );
  // Reconstruct the pre-Prisma foundation with a persisted user and session.
  const legacyFile = path.join(directory, "legacy.sqlite");
  const legacy = new Sqlite(legacyFile);
  const foundation = fs.readFileSync(
    "prisma/migrations/20261003000000_foundation/migration.sql",
    "utf8",
  );
  legacy.exec(foundation);
  legacy
    .prepare("INSERT INTO schema_migrations VALUES (?,?)")
    .run("001-foundation.sql", Date.now());
  legacy
    .prepare(
      "INSERT INTO users(email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)",
    )
    .run(
      "legacy@example.test",
      "Legacy",
      "existing-hash",
      Date.now(),
      Date.now(),
    );
  legacy
    .prepare("INSERT INTO sessions VALUES (?,?,?)")
    .run(
      "legacy-session",
      Date.now() + 86400000,
      JSON.stringify({ userId: 1 }),
    );
  legacy
    .prepare(
      "INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES (1,'verification',?,?)",
    )
    .run("existing-token-hash", Date.now() + 86400000);
  legacy
    .prepare(
      "INSERT INTO skills(slug,owner_id,category_id,created_at,updated_at) VALUES ('legacy-skill',1,1,?,?)",
    )
    .run(Date.now(), Date.now());
  legacy.exec(
    "INSERT INTO tags(name) VALUES ('legacy'); INSERT INTO skill_tags VALUES (1,1); INSERT INTO skill_supported_tools VALUES (1,1); INSERT INTO skill_links(skill_id,type,url) VALUES (1,'source','https://example.test');",
  );
  legacy
    .prepare(
      "INSERT INTO audit_events(actor_id,action,target_type,target_id,summary,created_at) VALUES (1,'legacy','user',1,'existing-audit',?)",
    )
    .run(Date.now());
  legacy.close();
  await migrate(legacyFile);
  await migrate(legacyFile);
  const adopted = await openDatabase(legacyFile);
  try {
    assert.equal(
      (
        await adopted.user.findUniqueOrThrow({
          where: { email: "legacy@example.test" },
        })
      ).password_hash,
      "existing-hash",
    );
    assert.equal(await adopted.session.count(), 1);
    assert.equal(
      (await adopted.authToken.findFirstOrThrow()).token_hash,
      "existing-token-hash",
    );
    assert.equal(
      (
        await adopted.skill.findUniqueOrThrow({
          where: { slug: "legacy-skill" },
          include: { tags: true, tools: true, links: true },
        })
      ).tags.length,
      1,
    );
    assert.equal(await adopted.skillSupportedTool.count(), 1);
    assert.equal(await adopted.skillLink.count(), 1);
    assert.equal(
      (await adopted.auditEvent.findFirstOrThrow()).summary,
      "existing-audit",
    );
    assert.equal(await adopted.legacyMigration.count(), 1);
    assert.deepEqual(await adopted.$queryRaw`PRAGMA foreign_key_check`, []);
  } finally {
    await adopted.$disconnect();
  }
  report(
    "Prisma repeat-safe fresh migrations and non-destructive legacy baseline; WAL/FKs",
  );
  const sessions = await createSessionStore(client);
  const start = async () => {
    server = createApp(config, client, sessions.store, mailer).listen(
      0,
      "127.0.0.1",
    );
    await once(server, "listening");
  };
  await start();
  class Browser {
    cookie = "";
    csrf = "";
    async request(route: string, data?: Record<string, string>) {
      const headers: Record<string, string> = this.cookie
        ? { cookie: this.cookie }
        : {};
      if (data) headers["content-type"] = "application/x-www-form-urlencoded";
      const response = await fetch(
        `http://127.0.0.1:${(server!.address() as AddressInfo).port}${route}`,
        {
          method: data ? "POST" : "GET",
          headers,
          body: data ? new URLSearchParams(data) : undefined,
          redirect: "manual",
        },
      );
      const cookie = response.headers.get("set-cookie");
      if (cookie) this.cookie = cookie.split(";")[0];
      const text = await response.text();
      this.csrf = text.match(/name="_csrf" value="([^"]+)"/)?.[1] || this.csrf;
      return { status: response.status, text, headers: response.headers };
    }
    post(route: string, data: Record<string, string> = {}) {
      return this.request(route, { _csrf: this.csrf, ...data });
    }
  }
  const visitor = new Browser();
  assert.equal((await visitor.request("/dashboard")).status, 303);
  assert.equal((await visitor.request("/health")).status, 200);
  assert.equal((await visitor.request("/assets/js/forms.js")).status, 200);
  await visitor.request("/register");
  assert.equal(
    (await visitor.request("/register", { email: "a@example.test", password }))
      .status,
    403,
  );
  assert.equal(
    (await visitor.post("/register", { email: "broken", password: "short" }))
      .status,
    422,
  );
  assert.equal(
    (
      await visitor.post("/register", {
        email: "  PERSON@EXAMPLE.TEST ",
        displayName: "<script>bad()</script>",
        password,
        role: "admin",
        status: "suspended",
      })
    ).status,
    303,
  );
  const repo = accounts(client);
  const user = await client.user.findUniqueOrThrow({
    where: { email: "person@example.test" },
  });
  assert.equal(user.role, "user");
  assert.equal(user.status, "active");
  assert.equal(user.verified_at, null);
  assert.match(user.password_hash!, /^\$argon2id\$/);
  assert(await argon2.verify(user.password_hash!, password));
  assert.equal(
    (
      await visitor.post("/register", {
        email: user.email,
        displayName: "Duplicate",
        password,
      })
    ).status,
    409,
  );
  await assert.rejects(
    repo.create(user.email, "Duplicate", user.password_hash!),
  );
  await assert.rejects(
    client.authToken.create({
      data: {
        user_id: 999,
        purpose: "reset",
        token_hash: "fake",
        expires_at: 999n,
      },
    }),
  );
  report(
    "Registration validation, unique normalized email, forged role ignored, Argon2id, CSRF",
  );
  await visitor.request("/login");
  const anonymousCookie = visitor.cookie;
  assert.equal(
    (await visitor.post("/login", { email: user.email, password: "wrong" }))
      .status,
    401,
  );
  assert.equal(
    (await visitor.post("/login", { email: user.email, password })).status,
    303,
  );
  assert.notEqual(visitor.cookie, anonymousCookie);
  assert(
    (await visitor.request("/dashboard")).text.includes(
      "&lt;script&gt;bad()&lt;/script&gt;",
    ),
  );
  assert.equal((await visitor.request("/admin")).status, 403);
  await close(server!);
  server = undefined;
  // A new client/store verifies persistence across connection/app restart.
  await client.$disconnect();
  db = await openDatabase(filename);
  const restartedSessions = await createSessionStore(db);
  server = createApp(config, db, restartedSessions.store, mailer).listen(
    0,
    "127.0.0.1",
  );
  await once(server, "listening");
  // PrismaClient reconnects on later calls; service probes keep using the original client.
  assert.equal((await visitor.request("/dashboard")).status, 200);
  const verification = messages.find(
    (message) => message.purpose === "verification",
  )!;
  await visitor.request(`/verify-email?token=${verification.token}`);
  assert.equal(
    await client.session.count({
      where: { sess: { contains: verification.token } },
    }),
    0,
  );
  assert.equal((await repo.byId(user.id))!.verified_at, null);
  assert.equal((await visitor.post("/verify-email")).status, 303);
  assert((await repo.byId(user.id))!.verified_at);
  assert.equal((await visitor.post("/verify-email")).status, 400);
  const service = authService(client, mailer);
  await assert.rejects(service.verify("invalid"));
  const oldCookie = visitor.cookie;
  await visitor.request("/dashboard");
  await visitor.post("/logout");
  visitor.cookie = oldCookie;
  assert.equal((await visitor.request("/dashboard")).status, 303);
  report(
    "Escaping, read-only token GET, single-use verification, session regeneration/restart/logout",
  );
  const recoveryBrowser = new Browser();
  await recoveryBrowser.request("/forgot-password");
  const known = await recoveryBrowser.post("/forgot-password", {
    email: user.email,
  });
  const unknown = await recoveryBrowser.post("/forgot-password", {
    email: "unknown@example.test",
  });
  assert.equal(known.status, unknown.status);
  assert.equal(known.headers.get("location"), unknown.headers.get("location"));
  const resetToken = messages.find(
    (message) => message.purpose === "reset",
  )!.token;
  await visitor.request("/login");
  await visitor.post("/login", { email: user.email, password });
  const authenticatedCookie = visitor.cookie;
  await recoveryBrowser.request(`/reset-password?token=${resetToken}`);
  const replacement = randomBytes(24).toString("hex");
  assert.equal(
    (await recoveryBrowser.post("/reset-password", { password: replacement }))
      .status,
    303,
  );
  visitor.cookie = authenticatedCookie;
  assert.equal((await visitor.request("/dashboard")).status, 303);
  await assert.rejects(service.login(user.email, password));
  assert.equal((await service.login(user.email, replacement)).id, user.id);
  await assert.rejects(service.reset(resetToken, password));
  report(
    "Recovery response parity, atomic password replacement, reset reuse rejection, session revocation",
  );
  failDelivery = true;
  assert.equal(
    (
      await service.register({
        email: "delivery@example.test",
        displayName: "Delivery",
        password,
      })
    ).delivered,
    false,
  );
  const deliveryUser = await client.user.findUniqueOrThrow({
    where: { email: "delivery@example.test" },
  });
  failDelivery = false;
  assert(await service.resend(deliveryUser.id));
  const oldResend = messages.at(-1)!.token;
  assert(await service.resend(deliveryUser.id));
  await assert.rejects(service.verify(oldResend));
  const expired = messages.at(-1)!.token;
  await client.authToken.update({
    where: { token_hash: hashToken(expired) },
    data: { expires_at: 0n },
  });
  await assert.rejects(service.verify(expired));
  await service.recover(deliveryUser.email);
  const expiredReset = messages.at(-1)!.token;
  await client.authToken.update({
    where: { token_hash: hashToken(expiredReset) },
    data: { expires_at: 0n },
  });
  await assert.rejects(service.reset(expiredReset, password));
  report(
    "Delivery failure preserves account; resend invalidation; expired verification/reset rejected",
  );
  await seed(client);
  await seed(client);
  const fixture = (name: string) =>
    client.user.findUniqueOrThrow({
      where: { email: `${name}@fixtures.example.test` },
    });
  const a = await fixture("a"),
    b = await fixture("b"),
    e = await fixture("e"),
    f = await fixture("f");
  const rules = policies(client);
  const skillA = await client.skill.findUniqueOrThrow({
    where: { slug: "fixture-a-draft" },
  });
  const skillB = await client.skill.findUniqueOrThrow({
    where: { slug: "fixture-b-published" },
  });
  const skillData = {
    owner_id: b.id,
    created_at: timestamp(),
    updated_at: timestamp(),
  };
  await assert.rejects(
    client.skill.create({ data: { ...skillData, slug: skillB.slug } }),
  );
  await assert.rejects(
    client.skill.create({ data: { ...skillData, slug: "Mixed-Case" } }),
  );
  await assert.rejects(rules.readSkill(skillA.id));
  await assert.rejects(rules.assertOwner(b.id, skillA.id));
  assert(await rules.readSkill(skillA.id, a.id));
  assert(await rules.readSkill(skillB.id));
  await assert.rejects(rules.assertPublish(a.id, skillA.id));
  assert(await rules.assertPublish(b.id, skillB.id));
  for (const name of ["c", "d"])
    await assert.rejects(service.login((await fixture(name)).email, password));
  const bootInput = {
    BOOTSTRAP_ENABLED: "true",
    BOOTSTRAP_EMAIL_VERIFIED: "true",
    BOOTSTRAP_EMAIL: "operator@example.test",
    BOOTSTRAP_NAME: "Operator",
    BOOTSTRAP_PASSWORD: password,
  };
  const adminId = await bootstrap(client, bootInput);
  const originalHash = (await repo.byId(adminId))!.password_hash;
  await bootstrap(client, { ...bootInput, BOOTSTRAP_PASSWORD: "different" });
  assert.equal((await repo.byId(adminId))!.password_hash, originalHash);
  assert.equal(
    await client.auditEvent.count({ where: { action: "admin_bootstrapped" } }),
    1,
  );
  await assert.rejects(
    bootstrap(client, { ...bootInput, BOOTSTRAP_ENABLED: "false" }),
  );
  const adminBrowser = new Browser();
  await adminBrowser.request("/login");
  await adminBrowser.post("/login", {
    email: bootInput.BOOTSTRAP_EMAIL,
    password,
  });
  assert.equal((await adminBrowser.request("/admin")).status, 200);
  await rules.changeAccount(e.id, adminId, {
    operation: "update",
    role: "user",
  });
  assert.equal((await adminBrowser.request("/admin")).status, 403);
  await visitor.request("/login");
  await visitor.post("/login", { email: user.email, password: replacement });
  await rules.changeAccount(e.id, user.id, {
    operation: "update",
    status: "suspended",
  });
  assert.equal((await visitor.request("/dashboard")).status, 303);
  await assert.rejects(service.login(user.email, replacement));
  await rules.changeAccount(e.id, b.id, {
    operation: "update",
    status: "suspended",
  });
  await assert.rejects(rules.readSkill(skillB.id));
  await rules.changeAccount(e.id, f.id, { operation: "update", role: "user" });
  for (const change of [
    { operation: "delete", skills: "delete" },
    { operation: "update", role: "user" },
    { operation: "update", status: "suspended" },
  ] as const)
    await assert.rejects(
      rules.changeAccount(e.id, e.id, change),
      (error: unknown) => error instanceof AppError && error.status === 409,
    );
  await assert.rejects(
    rules.changeAccount(e.id, a.id, { operation: "delete" }),
  );
  assert(await repo.byId(a.id)); // Failed transaction must preserve the account and skill.
  await rules.changeAccount(e.id, a.id, {
    operation: "delete",
    skills: "reassign",
    newOwnerId: f.id,
  });
  assert.equal(await repo.byId(a.id), null);
  assert.equal(
    (await client.skill.findUniqueOrThrow({ where: { id: skillA.id } }))
      .owner_id,
    f.id,
  );
  const deletedBrowser = new Browser();
  await deletedBrowser.request("/login");
  await deletedBrowser.post("/login", { email: deliveryUser.email, password });
  const deletedCookie = deletedBrowser.cookie;
  await rules.changeAccount(e.id, deliveryUser.id, {
    operation: "delete",
    skills: "delete",
  });
  deletedBrowser.cookie = deletedCookie;
  assert.equal((await deletedBrowser.request("/dashboard")).status, 303);
  assert.equal(
    await client.authToken.count({ where: { user_id: deliveryUser.id } }),
    0,
  );
  report(
    "Owner/publication policies, current role/status, explicit reassignment, transaction rollback, last-admin guards, repeat-safe bootstrap",
  );
  await rules.changeAccount(e.id, f.id, { operation: "update", role: "admin" });
  const gate = new SharedArrayBuffer(4);
  const workers = [e.id, f.id].map(
    (id) =>
      new Worker(
        `require('tsx/esm/api').tsImport(${JSON.stringify(new URL("./fixtures/lifecycle-worker.ts", import.meta.url).href)}, ${JSON.stringify(import.meta.url)}).catch(error => { throw error; });`,
        { eval: true, workerData: { filename, id, gate } },
      ),
  );
  try {
    const results = workers.map(
      (worker) =>
        new Promise<string>((resolve, reject) => {
          worker.on("message", (message: string) => {
            if (message !== "ready") resolve(message);
          });
          worker.on("error", reject);
        }),
    );
    await Promise.all(workers.map((worker) => once(worker, "message")));
    Atomics.store(new Int32Array(gate), 0, 1);
    Atomics.notify(new Int32Array(gate), 0);
    assert.deepEqual((await Promise.all(results)).sort(), [
      "changed",
      "protected",
    ]);
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
  assert.equal(
    await client.user.count({ where: { role: "admin", status: "active" } }),
    1,
  );
  report(
    "Competing Prisma lifecycle transactions on separate worker connections preserve final active admin",
  );
  const extraBrowser = new Browser();
  await extraBrowser.request("/login");
  let status = 0;
  for (let i = 0; i < 11; i++)
    status = (
      await extraBrowser.post("/login", {
        email: "missing@example.test",
        password: "wrong",
      })
    ).status;
  assert.equal(status, 429);
  await extraBrowser.request("/forgot-password");
  for (let i = 0; i < 4; i++)
    status = (
      await extraBrowser.post("/forgot-password", {
        email: "unknown@example.test",
      })
    ).status;
  assert.equal(status, 429);
  for (const route of [
    "/logout",
    "/data/app.sqlite",
    "/.env",
    "/src/app.ts",
    "/admin/bootstrap",
  ])
    assert.equal((await extraBrowser.request(route)).status, 404);
  const httpsApp = createApp(
    {
      ...config,
      APP_URL: "https://localhost",
      secureCookies: true,
      TRUST_PROXY: 1,
    },
    client,
    sessions.store,
    mailer,
  ).listen(0, "127.0.0.1");
  await once(httpsApp, "listening");
  try {
    const response = await fetch(
      `http://127.0.0.1:${(httpsApp.address() as AddressInfo).port}/login`,
      { headers: { "x-forwarded-proto": "https" } },
    );
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
  } finally {
    await close(httpsApp);
  }
  const backupFile = await backup(filename, path.join(directory, "backups"));
  const restored = await openDatabase(backupFile);
  try {
    assert.equal(await restored.user.count(), await client.user.count());
    assert.equal(
      (
        await restored.$queryRaw<
          { integrity_check: string }[]
        >`PRAGMA integrity_check`
      )[0].integrity_check,
      "ok",
    );
  } finally {
    await restored.$disconnect();
  }
  await client.session.create({
    data: { sid: "expired-fixture", sess: "{}", expired: 0n },
  });
  await cleanup(client, path.join(directory, "backups"));
  assert.equal(
    await client.session.findUnique({ where: { sid: "expired-fixture" } }),
    null,
  );
  report(
    "Throttling, HTTPS cookies (proxy simulation), static boundary, live backup restoration and retention cleanup",
  );
  await close(server!);
  server = undefined;
  await client.$disconnect();
  const invalid = spawn(process.execPath, ["dist/src/server.js"], {
    env: { ...process.env, SESSION_SECRET: "", DATABASE_PATH: filename },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  invalid.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  invalid.stderr.on("data", (chunk) => {
    output += String(chunk);
  });
  assert.equal((await once(invalid, "exit"))[0], 1);
  assert.match(output, /Invalid configuration/);
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = String((probe.address() as AddressInfo).port);
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  const live = spawn(process.execPath, ["dist/src/server.js"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      APP_URL: config.APP_URL,
      DATABASE_PATH: filename,
      SESSION_SECRET: config.SESSION_SECRET,
      PORT: port,
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
      EMAIL_FROM: config.EMAIL_FROM,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        live.stdout.on("data", (chunk) => {
          if (String(chunk).includes("listening")) resolve();
        });
        live.once("exit", () =>
          reject(new Error("Compiled server startup failed")),
        );
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Server startup timed out")),
          10000,
        ).unref(),
      ),
    ]);
    const exited = once(live, "exit");
    live.kill(process.platform === "win32" ? undefined : "SIGTERM");
    const [code] = await exited;
    if (process.platform !== "win32") assert.equal(code, 0);
  } finally {
    if (live.exitCode === null) live.kill();
  }
  report(
    "Compiled server startup/shutdown and safe missing-configuration rejection",
  );
  console.info(
    "Local TypeScript/Prisma acceptance checks complete; browser and staging evidence remains environment-specific.",
  );
} finally {
  if (server) await close(server);
  await db?.$disconnect();
  await originalClient?.$disconnect();
  fs.rmSync(directory, { recursive: true, force: true });
}
