// Controlled local acceptance checks; no test framework, credentials, or raw tokens in output.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { Worker } from "node:worker_threads";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { openDatabase } from "../src/db/connection.js";
import { migrate } from "../src/db/migrate.js";
import { createSessionStore } from "../src/middleware/session.js";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { authService, hashToken } from "../src/services/auth.js";
import { accounts } from "../src/repositories/accounts.js";
import { policies } from "../src/services/policies.js";
import { seed } from "../src/db/seed.js";
import { bootstrap } from "./bootstrap-admin.js";
import { backup } from "./backup-db.js";
import { cleanup } from "./cleanup.js";
import { createMailer } from "../src/services/email.js";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skillmart-check-"));
const filename = path.join(directory, "app.sqlite");
const db = openDatabase(filename);
let sessions, server;
const secret = randomBytes(48).toString("hex");
const config = loadConfig({
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_PATH: filename,
  SESSION_SECRET: secret,
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  EMAIL_FROM: "noreply@example.test",
});
const password = randomBytes(24).toString("hex");
const messages = [];
let failDelivery = false;
const mailer = {
  async send(user, purpose, token) {
    if (failDelivery) throw new Error("Simulated delivery failure");
    messages.push({ id: user.id, purpose, token });
  },
};
const report = (message) => console.info(`PASS ${message}`);
const child = async (script, env) => {
  const processChild = spawn(process.execPath, [script], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  processChild.stdout.on("data", (chunk) => (output += chunk));
  processChild.stderr.on("data", (chunk) => (output += chunk));
  const [code] = await once(processChild, "exit");
  return { code, output };
};
try {
  const terminal = [];
  const info = console.info;
  const token = randomBytes(32).toString("hex");
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
  try {
    console.info = (message) => terminal.push(message);
    await developmentMailer.send(
      { email: "fixture@example.test" },
      "verification",
      token,
    );
    assert.equal(terminal.length, 2);
    assert(terminal[0].includes(token));
    assert(
      terminal[1].includes(`${config.APP_URL}/verify-email?token=${token}`),
    );
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
  report(
    "Development verification bypasses unavailable SMTP and logs code/link; production and recovery never log tokens",
  );
  assert.throws(() => loadConfig({}), /Invalid configuration/);
  const invalidStart = await child("src/server.js", {
    SESSION_SECRET: "",
    DATABASE_PATH: filename,
  });
  assert.equal(invalidStart.code, 1);
  assert.match(invalidStart.output, /Invalid configuration/);
  migrate(db);
  migrate(db);
  assert.equal(
    db.prepare("SELECT count(*) n FROM schema_migrations").get().n,
    1,
  );
  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
  assert.equal(db.pragma("journal_mode", { simple: true }), "wal");
  const migrationDir = path.join(directory, "migrations");
  fs.mkdirSync(migrationDir);
  fs.writeFileSync(
    path.join(migrationDir, "999-failed.sql"),
    "CREATE TABLE should_rollback(id); INSERT INTO nonexistent VALUES (1);",
  );
  assert.throws(() => migrate(db, migrationDir));
  assert.equal(
    db
      .prepare("SELECT name FROM sqlite_master WHERE name='should_rollback'")
      .get(),
    undefined,
  );
  assert.equal(
    db
      .prepare("SELECT name FROM schema_migrations WHERE name='999-failed.sql'")
      .get(),
    undefined,
  );
  report(
    "V03/V05 safe config, WAL/FKs, repeat migrations, failed migration rollback",
  );
  sessions = await createSessionStore(filename);
  const start = async () => {
    server = createApp(config, db, sessions.store, mailer).listen(
      0,
      "127.0.0.1",
    );
    await once(server, "listening");
  };
  const stop = () => new Promise((resolve) => server.close(resolve));
  await start();
  class Browser {
    cookie = "";
    csrf = "";
    async request(route, data) {
      const headers = this.cookie ? { cookie: this.cookie } : {};
      if (data) headers["content-type"] = "application/x-www-form-urlencoded";
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}${route}`,
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
    post(route, data = {}) {
      return this.request(route, { _csrf: this.csrf, ...data });
    }
  }
  const visitor = new Browser();
  assert.equal((await visitor.request("/dashboard")).status, 303);
  assert.equal((await visitor.request("/health")).status, 200);
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
  const repo = accounts(db);
  const user = repo.byEmail("person@example.test");
  assert.equal(user.role, "user");
  assert.equal(user.status, "active");
  assert.equal(user.verified_at, null);
  assert.match(user.password_hash, /^\$argon2id\$/);
  assert(await argon2.verify(user.password_hash, password));
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
  assert.throws(() => repo.create(user.email, "Duplicate", user.password_hash));
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES (999,'reset','fake',999)",
      )
      .run(),
  );
  report(
    "V06/V13 registration validation, normalized unique email, forged role ignored, Argon2id, CSRF",
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
  const dashboard = await visitor.request("/dashboard");
  assert.equal(dashboard.status, 200);
  assert(dashboard.text.includes("&lt;script&gt;bad()&lt;/script&gt;"));
  assert.equal((await visitor.request("/admin")).status, 403);
  await stop();
  await sessions.close();
  sessions = await createSessionStore(filename);
  await start();
  assert.equal((await visitor.request("/dashboard")).status, 200);
  const verification = messages.find((m) => m.purpose === "verification");
  await visitor.request(`/verify-email?token=${verification.token}`);
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM sessions WHERE instr(sess,?)>0")
      .get(verification.token).n,
    0,
  );
  assert.equal(repo.byId(user.id).verified_at, null);
  assert.equal((await visitor.post("/verify-email")).status, 303);
  assert(repo.byId(user.id).verified_at);
  assert.equal((await visitor.post("/verify-email")).status, 400);
  const service = authService(db, mailer);
  assert.throws(() => service.verify("invalid"));
  const oldCookie = visitor.cookie;
  await visitor.request("/dashboard");
  assert.equal((await visitor.post("/logout")).status, 303);
  visitor.cookie = oldCookie;
  assert.equal((await visitor.request("/dashboard")).status, 303);
  report(
    "V04/V07/V08 escaped user content, read-only token GET, single-use verification, session regeneration/restart/logout",
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
  const resetToken = messages.find((m) => m.purpose === "reset").token;
  await visitor.request("/login");
  await visitor.post("/login", { email: user.email, password });
  await visitor.request("/dashboard");
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
    "V09 consistent recovery response, reset hash replacement, single-use reset and session revocation",
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
  const deliveryUser = repo.byEmail("delivery@example.test");
  assert(deliveryUser);
  failDelivery = false;
  assert(await service.resend(deliveryUser.id));
  const firstResend = messages.at(-1).token;
  assert(await service.resend(deliveryUser.id));
  assert.throws(() => service.verify(firstResend));
  const expired = messages.at(-1).token;
  db.prepare("UPDATE auth_tokens SET expires_at=0 WHERE token_hash=?").run(
    hashToken(expired),
  );
  assert.throws(() => service.verify(expired));
  await service.recover(deliveryUser.email);
  const expiredReset = messages.at(-1).token;
  db.prepare("UPDATE auth_tokens SET expires_at=0 WHERE token_hash=?").run(
    hashToken(expiredReset),
  );
  await assert.rejects(service.reset(expiredReset, password));
  report(
    "V07/V09 delivery failure preserves account, resend replacement, expired verification/reset rejected",
  );
  await seed(db);
  await seed(db);
  const fixture = (name) => repo.byEmail(`${name}@fixtures.example.test`);
  const rules = policies(db);
  const skillA = db
    .prepare("SELECT id FROM skills WHERE slug='fixture-a-draft'")
    .get().id;
  const skillB = db
    .prepare("SELECT id FROM skills WHERE slug='fixture-b-published'")
    .get().id;
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO skills(slug,owner_id,created_at,updated_at) VALUES (?,?,0,0)",
      )
      .run("fixture-b-published", fixture("b").id),
  );
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO skills(slug,owner_id,created_at,updated_at) VALUES (?,?,0,0)",
      )
      .run("Mixed-Case", fixture("b").id),
  );
  assert.throws(() => rules.readSkill(skillA));
  assert.throws(() => rules.assertOwner(fixture("b").id, skillA));
  assert(rules.readSkill(skillA, fixture("a").id));
  assert(rules.readSkill(skillB));
  assert.throws(() => rules.assertPublish(fixture("a").id, skillA));
  assert(rules.assertPublish(fixture("b").id, skillB));
  for (const name of ["c", "d"])
    await assert.rejects(service.login(fixture(name).email, password));
  const bootInput = {
    BOOTSTRAP_ENABLED: "true",
    BOOTSTRAP_EMAIL_VERIFIED: "true",
    BOOTSTRAP_EMAIL: "operator@example.test",
    BOOTSTRAP_NAME: "Operator",
    BOOTSTRAP_PASSWORD: password,
  };
  const adminId = await bootstrap(db, bootInput);
  const originalHash = repo.byId(adminId).password_hash;
  await bootstrap(db, { ...bootInput, BOOTSTRAP_PASSWORD: "different" });
  assert.equal(repo.byId(adminId).password_hash, originalHash);
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM audit_events WHERE action='admin_bootstrapped'",
      )
      .get().n,
    1,
  );
  await assert.rejects(
    bootstrap(db, { ...bootInput, BOOTSTRAP_ENABLED: "false" }),
  );
  const adminBrowser = new Browser();
  await adminBrowser.request("/login");
  await adminBrowser.post("/login", {
    email: bootInput.BOOTSTRAP_EMAIL,
    password,
  });
  assert.equal((await adminBrowser.request("/admin")).status, 200);
  rules.changeAccount(fixture("e").id, adminId, {
    operation: "update",
    role: "user",
  });
  assert.equal((await adminBrowser.request("/admin")).status, 403);
  await visitor.request("/login");
  await visitor.post("/login", { email: user.email, password: replacement });
  rules.changeAccount(fixture("e").id, user.id, {
    operation: "update",
    status: "suspended",
  });
  assert.equal((await visitor.request("/dashboard")).status, 303);
  await assert.rejects(service.login(user.email, replacement));
  rules.changeAccount(fixture("e").id, fixture("b").id, {
    operation: "update",
    status: "suspended",
  });
  assert.throws(() => rules.readSkill(skillB));
  rules.changeAccount(fixture("e").id, fixture("f").id, {
    operation: "update",
    role: "user",
  });
  assert.throws(() =>
    rules.changeAccount(fixture("e").id, fixture("e").id, {
      operation: "delete",
      skills: "delete",
    }),
  );
  assert.throws(() =>
    rules.changeAccount(fixture("e").id, fixture("e").id, {
      operation: "update",
      role: "user",
    }),
  );
  assert.throws(() =>
    rules.changeAccount(fixture("e").id, fixture("e").id, {
      operation: "update",
      status: "suspended",
    }),
  );
  assert.throws(() =>
    rules.changeAccount(fixture("e").id, fixture("a").id, {
      operation: "delete",
    }),
  );
  rules.changeAccount(fixture("e").id, fixture("a").id, {
    operation: "delete",
    skills: "reassign",
    newOwnerId: fixture("f").id,
  });
  assert.equal(repo.byEmail("a@fixtures.example.test"), undefined);
  assert.equal(
    db.prepare("SELECT owner_id FROM skills WHERE id=?").get(skillA).owner_id,
    fixture("f").id,
  );
  const deletedBrowser = new Browser();
  await deletedBrowser.request("/login");
  assert.equal(
    (
      await deletedBrowser.post("/login", {
        email: deliveryUser.email,
        password,
      })
    ).status,
    303,
  );
  const deletedCookie = deletedBrowser.cookie;
  rules.changeAccount(fixture("e").id, deliveryUser.id, {
    operation: "delete",
    skills: "delete",
  });
  deletedBrowser.cookie = deletedCookie;
  assert.equal((await deletedBrowser.request("/dashboard")).status, 303);
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM auth_tokens WHERE user_id=?")
      .get(deliveryUser.id).n,
    0,
  );
  report(
    "V10/V11/V12 owner/publication policies, current-role/status, explicit reassignment, last-admin guards, repeat-safe bootstrap",
  );
  rules.changeAccount(fixture("e").id, fixture("f").id, {
    operation: "update",
    role: "admin",
  });
  const gate = new SharedArrayBuffer(4);
  const workers = ["e", "f"].map(
    (name) =>
      new Worker(new URL("./fixtures/lifecycle-worker.js", import.meta.url), {
        workerData: { filename, id: fixture(name).id, gate },
      }),
  );
  const results = workers.map(
    (worker) =>
      new Promise((resolve, reject) => {
        worker.on("message", (message) => {
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
  await Promise.all(workers.map((worker) => worker.terminate()));
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM users WHERE role='admin' AND status='active'",
      )
      .get().n,
    1,
  );
  report(
    "V11 competing lifecycle calls on separate connections preserve the final active admin",
  );
  const extraBrowser = new Browser();
  await extraBrowser.request("/login");
  let status;
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
  assert.equal((await extraBrowser.request("/logout")).status, 404);
  for (const route of [
    "/data/app.sqlite",
    "/.env",
    "/src/app.js",
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
    db,
    sessions.store,
    mailer,
  ).listen(0, "127.0.0.1");
  await once(httpsApp, "listening");
  try {
    const response = await fetch(
      `http://127.0.0.1:${httpsApp.address().port}/login`,
      { headers: { "x-forwarded-proto": "https" } },
    );
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
  } finally {
    await new Promise((resolve) => httpsApp.close(resolve));
  }
  const backupFile = await backup(db, path.join(directory, "backups"));
  const restored = openDatabase(backupFile);
  assert.equal(
    restored.prepare("SELECT count(*) n FROM users").get().n,
    db.prepare("SELECT count(*) n FROM users").get().n,
  );
  assert.equal(restored.pragma("integrity_check", { simple: true }), "ok");
  restored.close();
  cleanup(db, path.join(directory, "backups"));
  report(
    "V13/V14 throttling, HTTPS cookie flags (proxy simulation), static boundary, backup restoration and cleanup",
  );
  await stop();
  server = null;
  await sessions.close();
  sessions = null;
  const childEnv = {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    PORT: "0",
    DATABASE_PATH: filename,
    SESSION_SECRET: secret,
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    EMAIL_FROM: "noreply@example.test",
  };
  // Use a real process for startup/shutdown, choosing a free port from an ephemeral listener.
  delete childEnv.PORT;
  const probe = createServer().listen(0);
  await once(probe, "listening");
  childEnv.PORT = String(probe.address().port);
  await new Promise((resolve) => probe.close(resolve));
  const live = spawn(process.execPath, ["src/server.js"], {
    env: { ...process.env, ...childEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        live.stdout.on("data", (chunk) => {
          if (String(chunk).includes("listening")) resolve();
        });
        live.once("exit", () => reject(new Error("Server startup failed")));
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Server startup timed out")),
          10000,
        ).unref(),
      ),
    ]);
    if (process.platform !== "win32") {
      live.kill("SIGTERM");
      assert.equal((await once(live, "exit"))[0], 0);
      report("V14 graceful SIGTERM shutdown");
    } else {
      live.kill();
      await once(live, "exit");
      report(
        "V03 real server startup; Windows process termination exercised (Unix graceful signal check deferred)",
      );
    }
  } finally {
    if (live.exitCode === null) live.kill();
  }
  console.info(
    "Local checks complete. Browser accessibility, real SMTP, and HTTPS staging remain environment-dependent.",
  );
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (sessions) await sessions.close();
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
