import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireUser } from "../middleware/access.js";
import { authController } from "../controllers/auth.js";
import type { AuthService } from "../services/auth.js";
import type { Csrf } from "../controllers/auth.js";

export function authRoutes(service: AuthService, csrf: Csrf) {
  const router = Router();
  const controller = authController(service, csrf);
  const options = {
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
    message: "Too many attempts. Please retry after the rate-limit window.",
  };
  const authLimit = rateLimit({ ...options, windowMs: 15 * 60000, limit: 10 });
  const emailLimit = rateLimit({ ...options, windowMs: 3600000, limit: 3 });
  router.get("/register", controller.show("register"));
  router.post("/register", authLimit, controller.register);
  router.get("/login", controller.show("login"));
  router.post("/login", authLimit, controller.login);
  router.post("/logout", controller.logout);
  router.get("/verify-email", controller.tokenPage("verify-email"));
  router.post("/verify-email", authLimit, controller.verify);
  router.post(
    "/resend-verification",
    requireUser,
    emailLimit,
    controller.resend,
  );
  router.get("/forgot-password", controller.show("forgot-password"));
  router.post("/forgot-password", emailLimit, controller.recover);
  router.get("/reset-password", controller.tokenPage("reset-password"));
  router.post("/reset-password", authLimit, controller.reset);
  return router;
}
