import { Router } from "express";
import type { Config } from "../config/env.js";
import type { Database } from "../db/connection.js";
import { marketplace } from "../services/marketplace.js";
import { pageMetadata, xmlEscape } from "../services/seo.js";
import { parseCatalog, catalogUrl } from "../validators/catalog.js";

export function publicRoutes(config: Config, db: Database) {
  const router = Router();
  const service = marketplace(db);
  router.get("/", async (req, res) => {
    if (req.originalUrl !== "/") return res.redirect(302, "/");
    const sections = await service.landing();
    const seo = pageMetadata(
      config.APP_URL,
      "Reusable AI skills, shared freely",
      "Discover practical AI instruction packages for development, writing, research, productivity and design. Browse and copy skills for free.",
      "/",
    );
    res
      .set("X-Robots-Tag", seo.robots)
      .render("public/landing", { ...sections, seo, title: seo.title });
  });
  router.get("/skills", async (req, res) => {
    const taxonomy = await service.taxonomy();
    const query = parseCatalog(
      new URL(req.originalUrl, config.APP_URL).searchParams,
      taxonomy,
    );
    const normalized = catalogUrl(query);
    if (req.originalUrl !== normalized) return res.redirect(302, normalized);
    const result = await service.catalog(query);
    const index =
      !query.q &&
      !query.category &&
      !query.tag &&
      !query.tool &&
      query.sort === "newest";
    const title = `Browse AI skills${query.page > 1 ? ` — Page ${query.page}` : ""}${query.q ? ` — ${query.q}` : ""}`;
    const seo = pageMetadata(
      config.APP_URL,
      title,
      "Find reusable AI skills by category, tag and supported tool. Instructions shared by creators, ready to read and copy.",
      normalized,
      index,
    );
    res.set("X-Robots-Tag", seo.robots).render("public/catalog", {
      ...result,
      taxonomy,
      query,
      catalogUrl,
      seo,
      title,
    });
  });
  router.get("/skills/:slug", async (req, res) => {
    const skill = await service.detail(String(req.params.slug));
    const pathname = `/skills/${encodeURIComponent(skill.slug)}`;
    if (req.originalUrl !== pathname) return res.redirect(302, pathname);
    const seo = pageMetadata(
      config.APP_URL,
      `${skill.title} — AI skill`,
      skill.summary,
      pathname,
    );
    res
      .set("X-Robots-Tag", seo.robots)
      .render("public/detail", { skill, seo, title: seo.title });
  });
  router.get("/robots.txt", (_req, res) => {
    const paths = [
      "/login",
      "/register",
      "/logout",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
      "/accept-invitation",
      "/dashboard",
      "/admin",
    ];
    res
      .type("text/plain")
      .send(
        `User-agent: *\n${paths.map((p) => `Disallow: ${p}`).join("\n")}\nSitemap: ${config.APP_URL}/sitemap.xml\n`,
      );
  });
  router.get("/sitemap.xml", async (_req, res) => {
    const entries = await service.sitemap();
    const url = (pathname: string, lastmod?: string) =>
      `<url><loc>${xmlEscape(new URL(pathname, config.APP_URL).href)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${url("/")}${url("/skills")}${entries.map((s) => url(`/skills/${encodeURIComponent(s.slug)}`, new Date(Number(s.updated_at)).toISOString())).join("")}</urlset>`,
      );
  });
  return router;
}
