import { accounts } from "../repositories/accounts.js";
import { AppError } from "../services/errors.js";

export function currentUser(db) {
  const repo = accounts(db);
  return (req, res, next) => {
    res.locals.user = null;
    if (!req.session.userId) return next();
    const user = repo.byId(req.session.userId);
    if (
      !user ||
      user.status !== "active" ||
      user.auth_version !== req.session.authVersion ||
      req.session.authExpires <= Date.now()
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
export function requireUser(req, res, next) {
  if (!req.user) return res.redirect(303, "/login");
  next();
}
export function requireAdmin(req, res, next) {
  if (!req.user) return res.redirect(303, "/login");
  if (req.user.role !== "admin")
    return next(new AppError("Administrator access is required.", 403));
  next();
}
