// Repeatable F002 checks against disposable data, never live .env data.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { spawnSync } from "node:child_process";
import type { AddressInfo } from "node:net";
import { openDatabase } from "../src/db/connection.js";
import { migrate } from "../src/db/migrate.js";
import { seed } from "../src/db/seed.js";
import { loadConfig } from "../src/config/env.js";
import { createSessionStore } from "../src/middleware/session.js";
import { createApp } from "../src/app.js";
import { publicSkills, skillsRepository } from "../src/repositories/skills.js";
import { marketplace } from "../src/services/marketplace.js";
import { parseCatalog, catalogUrl } from "../src/validators/catalog.js";
import { renderMarkdown } from "../src/services/markdown.js";
import { hashPassword } from "../src/services/auth.js";

const temporary =
  process.platform === "win32"
    ? path.join(os.tmpdir(), "opencode")
    : os.tmpdir();
const directory = fs.mkdtempSync(
  path.join(temporary, "skillmart-marketplace-"),
);
const filename = path.join(directory, "catalog.sqlite");
const db = await openDatabase(filename);
let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
const report = (message: string) => console.info(`PASS ${message}`);
try {
  await migrate(filename);
  await seed(db);
  const initial = await db.skill.count();
  const edited = await db.skill.findUniqueOrThrow({
    where: { slug: "sample-review-a-pull-request" },
  });
  await db.skill.update({
    where: { id: edited.id },
    data: { description: "Operator edit retained" },
  });
  const unrelated = await db.tag.create({ data: { name: "operator-tag" } });
  await seed(db);
  assert.equal(await db.skill.count(), initial);
  assert.equal(
    (await db.skill.findUniqueOrThrow({ where: { id: edited.id } }))
      .description,
    "Operator edit retained",
  );
  assert(await db.tag.findUnique({ where: { id: unrelated.id } }));
  assert((await db.skill.count({ where: publicSkills })) >= 25);
  assert.equal(await db.category.count(), 5);
  assert.equal(await db.supportedTool.count(), 4);
  const configInput = {
    APP_URL: "http://localhost:3000",
    DATABASE_PATH: filename,
    SESSION_SECRET: randomBytes(48).toString("hex"),
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    EMAIL_FROM: "noreply@example.test",
  };
  const guard = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/db/seed.ts"],
    {
      env: {
        ...process.env,
        ...configInput,
        NODE_ENV: "production",
        APP_URL: "https://example.test",
        SEED_ENABLED: "true",
      },
      encoding: "utf8",
    },
  );
  assert.notEqual(guard.status, 0);
  assert(guard.stderr.includes("Fixtures require"));
  assert.equal(await db.skill.count(), initial);
  report(
    "V02 realistic, guarded, repeat-safe seed preserves unrelated data and operator edits",
  );
  const config = loadConfig({ ...configInput, NODE_ENV: "test" });
  const sessions = await createSessionStore(db);
  server = createApp(config, db, sessions.store, { async send() {} }).listen(
    0,
    "127.0.0.1",
  );
  await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = async (url: string, status = 200) => {
    const response = await fetch(`${origin}${url}`, { redirect: "manual" });
    assert.equal(response.status, status, url);
    const html = await response.text();
    if (status >= 400) {
      assert.equal(response.headers.get("x-robots-tag"), "noindex");
      assert(html.includes('name="robots" content="noindex"'));
      assert(!html.includes('rel="canonical"'));
      assert(!html.includes('property="og:url"'));
    }
    return { response, html };
  };
  const redirect = async (url: string, destination: string) => {
    const { response } = await request(url, 302);
    assert.equal(response.headers.get("location"), destination);
    await request(destination);
  };
  const landing = await request("/");
  assert(landing.html.includes("does not execute"));
  assert(landing.html.includes('href="/login">Publish a skill'));
  assert.equal(
    (landing.html.match(/class="card skill-card"/g) || []).length,
    12,
  );
  for (const url of [
    "/",
    "/skills",
    "/skills?page=2",
    "/skills/sample-review-a-pull-request",
  ]) {
    const { html, response } = await request(url);
    for (const marker of [
      'name="description"',
      'property="og:title"',
      'property="og:type"',
      'name="twitter:card" content="summary"',
    ])
      assert(html.includes(marker));
    assert(html.includes(`href="http://localhost:3000${url}"`));
    assert.equal(response.headers.get("x-robots-tag"), "index,follow");
    assert(!html.includes("@fixtures.example.test"));
  }
  const hostileHost = await fetch(`${origin}/skills`, {
    headers: { Host: "hostile.example" },
  });
  assert(
    (await hostileHost.text()).includes('href="http://localhost:3000/skills"'),
  );
  const page2 = await request("/skills?page=2");
  assert(page2.html.includes("Page 2"));
  assert.equal((page2.html.match(/class="card skill-card"/g) || []).length, 12);
  report(
    "V04/V06/V08/V11 initial HTML, landing limits, public metadata, pagination and Host-independent URLs",
  );
  const taxonomy = await skillsRepository(db).taxonomy();
  const service = marketplace(db);
  const query = (value: string) =>
    parseCatalog(new URLSearchParams(value), taxonomy);
  const results = async (value: string) =>
    (await service.catalog(query(value))).records;
  assert.deepEqual(
    (await results("q=REVIEW A PULL REQUEST")).map((s) => s.id),
    [edited.id],
  );
  assert((await results("q=tag-only-discovery")).length > 0);
  assert.equal((await results("q=Explain your assumptions")).length, 0);
  for (const q of ["%25", "literal_underlines", "_"])
    assert.equal((await results(`q=${q}`)).length, 1);
  const filteredQuery = new URLSearchParams({
    category: "development",
    tag: "workflow",
    tool: taxonomy.tools[0].name,
  });
  const combinedResults = await results(filteredQuery.toString());
  assert(combinedResults.length > 0);
  for (const skill of combinedResults) {
    assert.equal(skill.category?.slug, "development");
    assert(skill.tags.some((t) => t.tag.name === "workflow"));
    assert(skill.tools.some((t) => t.tool.name === taxonomy.tools[0].name));
  }
  for (const sort of ["newest", "updated", "title"]) {
    const records = [];
    for (let page = 1; page <= 3; page++)
      records.push(...(await results(`sort=${sort}&page=${page}`)));
    assert.equal(new Set(records.map((s) => s.id)).size, records.length);
    const rows = await db.skill.findMany({ where: publicSkills });
    rows.sort(
      (a, b) =>
        (sort === "title"
          ? a.title.toLowerCase() < b.title.toLowerCase()
            ? -1
            : a.title.toLowerCase() > b.title.toLowerCase()
              ? 1
              : 0
          : Number(
              sort === "updated"
                ? b.updated_at - a.updated_at
                : b.created_at - a.created_at,
            )) || a.id - b.id,
    );
    assert.deepEqual(
      records.map((s) => s.id),
      rows.map((s) => s.id),
    );
  }
  const combined = catalogUrl(query(filteredQuery.toString()));
  const filtered = await request(combined);
  assert.equal(filtered.response.headers.get("x-robots-tag"), "noindex,follow");
  assert(
    filtered.html.includes(
      `href="http://localhost:3000${combined.replaceAll("&", "&amp;")}"`,
    ),
  );
  await request("/skills?q=no-matches-xyz");
  await request("/skills?page=4", 404);
  await request("/skills?q=no-matches-xyz&page=2", 404);
  for (const value of [
    "q=a&q=b",
    "q[x]=x",
    "category=unknown",
    "tag=unknown",
    "tool=unknown",
    "sort=popular",
    `q=${"a".repeat(101)}`,
    ...["0", "-1", "1.1", "10001", "9007199254740992", "abc"].map(
      (p) => `page=${p}`,
    ),
  ])
    await request(`/skills?${value}`, 400);
  for (const [url, destination] of [
    ["/skills?page=01&sort=newest&q=", "/skills"],
    ["/skills?tracking=x", "/skills"],
    ["/skills?sort=title&q=%20review%20", "/skills?q=review&sort=title"],
    ["/?tracking=x", "/"],
    [
      "/skills/sample-review-a-pull-request?tracking=x",
      "/skills/sample-review-a-pull-request",
    ],
  ])
    await redirect(url, destination);
  for (const url of [
    "/login",
    "/register",
    "/verify-email?token=private-marker",
    "/reset-password?token=private-marker",
    "/forgot-password",
  ]) {
    const { html, response } = await request(url);
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert(!html.includes('rel="canonical"'));
    assert(!html.includes('property="og:url"'));
  }
  for (const url of ["/dashboard", "/admin"]) {
    const { response } = await request(url, 303);
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
  }
  report(
    "V05–V07/V12 literal search, combined filters, deterministic sorts, normalization, query limits and noindex",
  );
  const safety = await request("/skills/sample-safe-markdown");
  assert(safety.html.includes("&lt;markup&gt;"));
  assert(!safety.html.includes('<img src="https://example.test'));
  assert(!safety.html.includes('href="javascript:'));
  assert(
    !renderMarkdown(
      "<script>alert(1)</script>\n\n![remote](https://example.test/a.png)\n\n[bad](javascript:alert(1))",
    ).includes("<script"),
  );
  assert(!renderMarkdown("[bad](data:text/html,x)").includes('href="data:'));
  assert(
    safety.response.headers
      .get("content-security-policy")
      ?.includes("script-src 'self'"),
  );
  const sitemap = async () => (await request("/sitemap.xml")).html;
  const initialSitemap = await sitemap();
  const entries = await skillsRepository(db).sitemap();
  assert.equal(
    (initialSitemap.match(/<url>/g) || []).length,
    entries.length + 2,
  );
  for (const entry of entries) {
    assert(
      initialSitemap.includes(
        `/skills/${encodeURIComponent(entry.slug)}</loc>`,
      ),
    );
    assert(
      initialSitemap.includes(
        `<lastmod>${new Date(Number(entry.updated_at)).toISOString()}</lastmod>`,
      ),
    );
  }
  assert(!initialSitemap.includes("?page="));
  const robots = await request("/robots.txt");
  assert(robots.html.includes("Sitemap: http://localhost:3000/sitemap.xml"));
  assert(!robots.html.includes("Disallow: /skills"));
  for (const slug of [
    "sample-private-draft",
    "sample-suspended-owner",
    "sample-invited-owner",
    "missing-skill",
  ]) {
    const unavailable = await request(`/skills/${slug}`, 404);
    assert(!unavailable.html.includes("Private fixture"));
    assert(!(await sitemap()).includes(`/skills/${slug}</loc>`));
  }
  const checkHidden = async () => {
    await request(`/skills/${edited.slug}`, 404);
    assert(!(await sitemap()).includes(`/skills/${edited.slug}</loc>`));
    assert(!(await results(`q=${edited.title}`)).length);
    assert(!(await request("/")).html.includes(`/skills/${edited.slug}"`));
  };
  await db.skill.update({
    where: { id: edited.id },
    data: { status: "draft" },
  });
  await checkHidden();
  await db.skill.update({
    where: { id: edited.id },
    data: { status: "published" },
  });
  await request(`/skills/${edited.slug}`);
  await db.user.update({
    where: { id: edited.owner_id },
    data: { status: "suspended" },
  });
  await checkHidden();
  await db.user.update({
    where: { id: edited.owner_id },
    data: { status: "active" },
  });
  await request(`/skills/${edited.slug}`);
  const nextOwner = await db.user.findUniqueOrThrow({
    where: { email: "b@fixtures.example.test" },
  });
  await db.skill.update({
    where: { id: edited.id },
    data: { owner_id: nextOwner.id, status: "draft" },
  });
  await checkHidden();
  await db.skill.update({
    where: { id: edited.id },
    data: { owner_id: edited.owner_id, status: "published" },
  });
  await request(`/skills/${edited.slug}`);
  await db.skill.delete({ where: { id: edited.id } });
  await checkHidden();
  report(
    "V03/V09/V13 sanitized Markdown, escaped metadata, crawler files and immediate visibility updates",
  );
  // Optional temporary browser tooling keeps Playwright out of app dependencies.
  if (process.env.MARKETPLACE_BROWSER_CHECK) {
    const module = (await import(
      pathToFileURL(process.env.MARKETPLACE_BROWSER_CHECK).href
    )) as {
      runBrowserChecks(
        origin: string,
        body: string,
        account: { email: string; password: string },
      ): Promise<void>;
    };
    const raw = await db.skill.findUniqueOrThrow({
      where: { slug: "sample-safe-markdown" },
    });
    const password = randomBytes(24).toString("hex");
    const email = "f@fixtures.example.test";
    await db.user.update({
      where: { email },
      data: { password_hash: await hashPassword(password) },
    });
    await module.runBrowserChecks(origin, raw.body, { email, password });
  }
  await db.skill.updateMany({ data: { featured: false } });
  assert((await request("/")).html.includes("No featured skills yet"));
  await db.skill.updateMany({ data: { status: "draft" } });
  assert((await request("/")).html.includes("No latest additions yet"));
  assert(
    (await request("/skills")).html.includes("The catalog is getting started"),
  );
  assert(
    (await request("/skills?q=review")).html.includes("No matching skills"),
  );
  await request("/skills?page=2", 404);
  const logs: string[] = [];
  const errorLog = console.error;
  try {
    console.error = (message: string) => logs.push(message);
    await db.$executeRawUnsafe(
      "ALTER TABLE skills RENAME TO unavailable_skills",
    );
    const failure = await request("/skills", 500);
    assert(failure.html.includes("Something went wrong"));
    assert(!failure.html.includes("PrismaClient"));
    assert.deepEqual(logs, ['{"event":"request_failed","status":500}']);
  } finally {
    console.error = errorLog;
  }
  report(
    "V10 generic noindex failure, distinct empty states and redacted logs",
  );
} finally {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  await db.$disconnect();
  fs.rmSync(directory, { recursive: true, force: true });
}
