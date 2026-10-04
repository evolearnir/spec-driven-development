import {
  validate,
  registration,
  login,
  recovery,
  reset,
} from "../validators/auth.js";
import { AppError } from "../services/errors.js";
import { hashToken } from "../services/auth.js";
import type { AuthService } from "../services/auth.js";
import type { Request, Response, RequestHandler } from "express";
import type { csrfSync } from "csrf-sync";
import type { z } from "zod";
export type Csrf = ReturnType<typeof csrfSync>;
type Page = keyof typeof definitions;
type TokenPage = "verify-email" | "reset-password";

const definitions = {
  register: {
    title: "Create your account",
    intro: "A place for practical skills. Start with your own account.",
    button: "Create account",
    fields: ["displayName", "email", "password"],
  },
  login: {
    title: "Welcome back",
    intro: "Sign in to your SkillMart workspace.",
    button: "Sign in",
    fields: ["email", "password"],
  },
  "forgot-password": {
    title: "Recover your account",
    intro: "We will email a reset link if an active account exists.",
    button: "Send reset link",
    fields: ["email"],
  },
  "reset-password": {
    title: "Choose a new password",
    intro: "Your other sessions will be signed out.",
    button: "Reset password",
    fields: ["password"],
  },
  "verify-email": {
    title: "Verify your email",
    intro:
      "Confirm this email belongs to you. Opening the link alone does not verify it.",
    button: "Confirm email",
    fields: [],
  },
};
export function authController(service: AuthService, csrf: Csrf) {
  function form(
    req: Request,
    res: Response,
    page: Page,
    options: Record<string, unknown> = {},
  ) {
    res.render("auth/form", {
      ...definitions[page],
      page,
      errors: {},
      values: {},
      message: null,
      ...options,
    });
  }
  function tokenPage(req: Request, res: Response, page: TokenPage) {
    const token = req.query.token;
    // Persist only its hash in the server session; never echo a link token in HTML.
    req.session[page] =
      typeof token === "string" && /^[a-f0-9]{64}$/.test(token)
        ? hashToken(token)
        : null;
    form(req, res, page);
  }
  function input<T>(
    req: Request,
    res: Response,
    page: Page,
    schema: z.ZodType<T>,
  ) {
    const result = validate(schema, req.body);
    if (result.errors) {
      res.status(422);
      form(req, res, page, {
        errors: result.errors,
        values: {
          email:
            typeof req.body.email === "string"
              ? req.body.email.slice(0, 254)
              : "",
          displayName:
            typeof req.body.displayName === "string"
              ? req.body.displayName.slice(0, 80)
              : "",
        },
      });
    }
    return result.data;
  }
  async function attempt(
    req: Request,
    res: Response,
    page: Page,
    action: () => Promise<void>,
  ) {
    try {
      await action();
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      res.status(e.status);
      form(req, res, page, {
        errors: { form: e.message },
        values: {
          email:
            typeof req.body.email === "string"
              ? req.body.email.slice(0, 254)
              : "",
          displayName:
            typeof req.body.displayName === "string"
              ? req.body.displayName.slice(0, 80)
              : "",
        },
      });
    }
  }
  function notice(req: Request, res: Response, message: string) {
    req.session.notice = message;
    res.redirect(303, "/login");
  }
  return {
    show:
      (page: Page): RequestHandler =>
      (req, res) =>
        form(req, res, page),
    tokenPage:
      (page: TokenPage): RequestHandler =>
      (req, res) =>
        tokenPage(req, res, page),
    register: async (req, res) =>
      attempt(req, res, "register", async () => {
        const data = input(req, res, "register", registration);
        if (!data) return;
        const result = await service.register(data);
        notice(
          req,
          res,
          result.delivered
            ? req.app.locals.developmentVerification
              ? "Account created. Use the verification link printed in the development terminal, then sign in."
              : "Account created. Check your email to verify, then sign in."
            : "Account created, but email delivery failed. Sign in to resend verification.",
        );
      }),
    login: async (req, res) =>
      attempt(req, res, "login", async () => {
        const data = input(req, res, "login", login);
        if (!data) return;
        const user = await service.login(data.email, data.password);
        await new Promise<void>((resolve, reject) =>
          req.session.regenerate((e) => (e ? reject(e) : resolve())),
        );
        req.session.userId = user.id;
        req.session.authVersion = user.auth_version;
        req.session.authExpires = Date.now() + 7 * 86400000;
        csrf.generateToken(req, true);
        // Browsers can follow redirect headers before the response body ends.
        // Persist the regenerated session before the dashboard can request it.
        await new Promise<void>((resolve, reject) =>
          req.session.save((e) => (e ? reject(e) : resolve())),
        );
        res.redirect(303, "/dashboard");
      }),
    logout: (req, res, next) =>
      req.session.destroy((e) => {
        if (e) return next(e);
        res.clearCookie("skillmart.sid", { path: "/" });
        res.redirect(303, "/login");
      }),
    verify: async (req, res) =>
      attempt(req, res, "verify-email", async () => {
        await service.verify(req.session["verify-email"], { hashed: true });
        delete req.session["verify-email"];
        notice(
          req,
          res,
          "Email verified. You can now sign in and publish when the catalog is available.",
        );
      }),
    resend: async (req, res) => {
      if (!req.user) throw new AppError("Sign in with an active account.", 403);
      const delivered = await service.resend(req.user.id);
      req.session.notice = delivered
        ? req.app.locals.developmentVerification
          ? "Verification code and link printed in the development terminal. Previous links have been replaced."
          : "Verification email sent. Previous links have been replaced."
        : "Email delivery failed. Please retry later.";
      res.redirect(303, "/dashboard");
    },
    recover: async (req, res) => {
      const data = input(req, res, "forgot-password", recovery);
      if (!data) return;
      await service.recover(data.email);
      notice(
        req,
        res,
        "If an active account exists, a reset link has been requested. If it does not arrive, retry later.",
      );
    },
    reset: async (req, res) =>
      attempt(req, res, "reset-password", async () => {
        const data = input(req, res, "reset-password", reset);
        if (!data) return;
        await service.reset(req.session["reset-password"], data.password, {
          hashed: true,
        });
        // Destroy the requesting session too; never resave a session removed by reset.
        await new Promise<void>((resolve, reject) =>
          req.session.destroy((e) => (e ? reject(e) : resolve())),
        );
        res.clearCookie("skillmart.sid", { path: "/" });
        res.redirect(303, "/login?reset=complete");
      }),
  } satisfies Record<
    "register" | "login" | "logout" | "verify" | "resend" | "recover" | "reset",
    RequestHandler
  > & {
    show(page: Page): RequestHandler;
    tokenPage(page: TokenPage): RequestHandler;
  };
}
