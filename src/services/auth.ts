import argon2 from "argon2";
import { randomBytes, createHash } from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import { accounts } from "../repositories/accounts.js";
import {
  timestamp,
  writeTransaction,
  type Database,
  type DbClient,
} from "../db/connection.js";
import type { Mailer, TokenPurpose } from "./email.js";
import type { z } from "zod";
import type { registration } from "../validators/auth.js";
import { AppError } from "./errors.js";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
export function authService(db: Database, mailer: Mailer) {
  const repo = accounts(db);
  const dummyHash = hashPassword(randomBytes(32).toString("hex"));
  async function issue(user: User, purpose: TokenPurpose) {
    const token = randomBytes(32).toString("hex");
    await writeTransaction(db, async (tx) => {
      await tx.authToken.deleteMany({
        where: { user_id: user.id, purpose, used_at: null },
      });
      await tx.authToken.create({
        data: {
          user_id: user.id,
          purpose,
          token_hash: hashToken(token),
          expires_at: BigInt(
            Date.now() + (purpose === "verification" ? 86400000 : 3600000),
          ),
        },
      });
    });
    return token;
  }
  async function deliver(user: User, purpose: TokenPurpose) {
    const token = await issue(user, purpose);
    try {
      await mailer.send(user, purpose, token);
      return true;
    } catch {
      console.warn(JSON.stringify({ event: "email_delivery_failed", purpose }));
      return false;
    }
  }
  async function validToken(
    client: DbClient,
    token: unknown,
    purpose: TokenPurpose,
    hashed = false,
  ) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new AppError("This link is invalid or expired. Request a new one.");
    const row = await client.authToken.findFirst({
      where: {
        token_hash: hashed ? token : hashToken(token),
        purpose,
        used_at: null,
        expires_at: { gt: timestamp() },
        user: { status: "active" },
      },
    });
    if (!row)
      throw new AppError("This link is invalid or expired. Request a new one.");
    return row;
  }
  return {
    async register(data: z.infer<typeof registration>) {
      const hash = await hashPassword(data.password);
      let user: User;
      try {
        user = await repo.create(data.email, data.displayName, hash);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new AppError(
            "An account with this email already exists. Log in or reset your password.",
            409,
          );
        throw error;
      }
      return { delivered: await deliver(user, "verification") };
    },
    async login(email: string, password: string) {
      const user = await repo.byEmail(email);
      const matches = await argon2.verify(
        user?.password_hash || (await dummyHash),
        password,
      );
      if (!matches || !user || user.status !== "active")
        throw new AppError(
          "Email or password is incorrect, or the account is unavailable.",
          401,
        );
      return user;
    },
    async resend(id: number) {
      const user = await repo.byId(id);
      if (!user || user.status !== "active" || user.verified_at)
        throw new AppError("Verification is unavailable for this account.");
      return deliver(user, "verification");
    },
    async verify(token: unknown, { hashed = false } = {}) {
      await writeTransaction(db, async (tx) => {
        const row = await validToken(tx, token, "verification", hashed);
        await tx.user.update({
          where: { id: row.user_id },
          data: { verified_at: timestamp(), updated_at: timestamp() },
        });
        await tx.authToken.update({
          where: { id: row.id },
          data: { used_at: timestamp() },
        });
      });
    },
    async recover(email: string) {
      const user = await repo.byEmail(email);
      if (user?.status === "active" && user.password_hash)
        await deliver(user, "reset");
    },
    async reset(token: unknown, password: string, { hashed = false } = {}) {
      await validToken(db, token, "reset", hashed);
      const hash = await hashPassword(password);
      await writeTransaction(db, async (tx) => {
        const row = await validToken(tx, token, "reset", hashed);
        await tx.user.update({
          where: { id: row.user_id },
          data: {
            password_hash: hash,
            updated_at: timestamp(),
            auth_version: { increment: 1 },
          },
        });
        await tx.authToken.updateMany({
          where: { user_id: row.user_id, purpose: "reset", used_at: null },
          data: { used_at: timestamp() },
        });
        await accounts(tx).revoke(row.user_id);
      });
    },
  };
}
export type AuthService = ReturnType<typeof authService>;
