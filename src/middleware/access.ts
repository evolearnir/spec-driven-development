import { accounts } from "../repositories/accounts.js";
import { AppError } from "../services/errors.js";
import type { Database } from "../db/connection.js";
import type { RequestHandler } from "express";

export function currentUser(db: Database): RequestHandler {
  const repo = accounts(db);
  return async (req, res, next) => {
    res.locals.user = null;
    if (!req.session.userId) return next();
    const user = await repo.byId(req.session.userId);
    if (
      !user ||
      user.status !== "active" ||
      user.auth_version !== req.session.authVersion ||
      (req.session.authExpires ?? 0) <= Date.now()
    ) {
      return req.session.regenerate((error) => {
        res.clearCookie("skillmart.sid", { path: "/" });
        next(error);
      });
    }
    req.user = user;
    res.locals.user = user;
    next();
  };
}
export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.user) return res.redirect(303, "/login");
  next();
};
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) return res.redirect(303, "/login");
  if (req.user.role !== "admin")
    return next(new AppError("Administrator access is required.", 403));
  next();
};
