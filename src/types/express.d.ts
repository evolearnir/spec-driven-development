import type { User } from "@prisma/client";
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
declare module "express-session" {
  interface SessionData {
    userId?: number;
    authVersion?: number;
    authExpires?: number;
    notice?: string;
    "verify-email"?: string | null;
    "reset-password"?: string | null;
  }
}
