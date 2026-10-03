import express from "express";
import helmet from "helmet";
import { csrfSync } from "csrf-sync";
import { fileURLToPath } from "node:url";
import { sessionMiddleware } from "./middleware/session.js";
import { currentUser, requireUser, requireAdmin } from "./middleware/access.js";
import { authRoutes } from "./routes/auth.routes.js";
import { authService } from "./services/auth.js";
import { AppError } from "./services/errors.js";

export function createApp(config, db, store, mailer) {
  const app = express();
  app.locals.developmentVerification = config.NODE_ENV === "development";
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY);
  app.set("view engine", "ejs");
  app.set("views", fileURLToPath(new URL("./views/", import.meta.url)));
  app.use(helmet({ referrerPolicy: { policy: "no-referrer" } }));
  app.use(
    "/assets",
    express.static(fileURLToPath(new URL("../public/", import.meta.url)), {
      dotfiles: "deny",
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.get("/health", (req, res) => {
    db.prepare("SELECT 1").get();
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
  app.get("/", (req, res) => res.redirect(302, "/login"));
  app.get("/dashboard", requireUser, (req, res) =>
    res.render("dashboard/index", { title: "Your workspace" }),
  );
  app.get("/admin", requireAdmin, (req, res) =>
    res.render("admin/index", { title: "Administration" }),
  );
  app.use((req, res, next) => next(new AppError("Page not found.", 404)));
  app.use((error, req, res, next) => {
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
    res.status(status).render("errors/index", {
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
  });
  return app;
}
