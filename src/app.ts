import express from "express";
import helmet from "helmet";
import { csrfSync } from "csrf-sync";
import { sessionMiddleware } from "./middleware/session.js";
import { currentUser, requireUser, requireAdmin } from "./middleware/access.js";
import { authRoutes } from "./routes/auth.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { authService } from "./services/auth.js";
import { AppError } from "./services/errors.js";
import type { Config } from "./config/env.js";
import type { Database } from "./db/connection.js";
import type { Mailer } from "./services/email.js";
import type { Store } from "express-session";
import type { ErrorRequestHandler } from "express";
import path from "node:path";

export function createApp(
  config: Config,
  db: Database,
  store: Store,
  mailer: Mailer,
) {
  const app = express();
  app.locals.developmentVerification = config.NODE_ENV === "development";
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY);
  app.set("view engine", "ejs");
  app.set("views", path.resolve("src/views"));
  app.use(helmet({ referrerPolicy: { policy: "no-referrer" } }));
  app.use((_req, res, next) => {
    res.set("X-Robots-Tag", "noindex");
    res.locals.seo = null;
    next();
  });
  app.use(
    "/assets/js",
    express.static(path.resolve("dist/client"), { dotfiles: "deny" }),
  );
  app.use(
    "/assets",
    express.static(path.resolve("public"), {
      dotfiles: "deny",
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.get("/health", async (req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });
  app.use(sessionMiddleware(config, store));
  app.use(currentUser(db));
  const csrf = csrfSync({ getTokenFromRequest: (req) => req.body?._csrf });
  app.use(csrf.csrfSynchronisedProtection);
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.locals.csrfToken = csrf.generateToken(req);
    res.locals.notice =
      req.session.notice ||
      (req.query.reset === "complete"
        ? "Password reset. Sign in with your new password."
        : null);
    delete req.session.notice;
    next();
  });
  app.use(authRoutes(authService(db, mailer), csrf));
  app.use(publicRoutes(config, db));
  app.get("/dashboard", requireUser, (req, res) =>
    res.render("dashboard/index", { title: "Your workspace" }),
  );
  app.get("/admin", requireAdmin, (req, res) =>
    res.render("admin/index", { title: "Administration" }),
  );
  app.use((req, res, next) => next(new AppError("Page not found.", 404)));
  const handleError: ErrorRequestHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);
    const csrfError = error.code === "EBADCSRFTOKEN";
    const status = csrfError
      ? 403
      : error instanceof AppError
        ? error.status
        : error.status === 413
          ? 413
          : 500;
    if (status === 500)
      console.error(JSON.stringify({ event: "request_failed", status }));
    res.set("X-Robots-Tag", "noindex");
    res.status(status).render("errors/index", {
      seo: null,
      title: `Request failed (${status})`,
      message: csrfError
        ? "Your form expired. Reload the page and try again."
        : status === 500
          ? "Something went wrong. Please try again later."
          : error.message,
      user: res.locals.user || null,
      csrfToken: res.locals.csrfToken || "",
      notice: null,
    });
  };
  app.use(handleError);
  return app;
}
