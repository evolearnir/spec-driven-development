import argon2 from "argon2";
import { randomBytes, createHash } from "node:crypto";
import { accounts } from "../repositories/accounts.js";
import { AppError } from "./errors.js";

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export const hashPassword = (password) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

export function authService(db, mailer) {
  const repo = accounts(db);
  const dummyHash = hashPassword(randomBytes(32).toString("hex"));
  function issue(user, purpose) {
    const token = randomBytes(32).toString("hex");
    db.transaction(() => {
      db.prepare(
        "DELETE FROM auth_tokens WHERE user_id=? AND purpose=? AND used_at IS NULL",
      ).run(user.id, purpose);
      db.prepare(
        "INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES (?,?,?,?)",
      ).run(
        user.id,
        purpose,
        hashToken(token),
        Date.now() + (purpose === "verification" ? 86400000 : 3600000),
      );
    }).immediate();
    return token;
  }
  async function deliver(user, purpose) {
    const token = issue(user, purpose);
    try {
      await mailer.send(user, purpose, token);
      return true;
    } catch {
      console.warn(JSON.stringify({ event: "email_delivery_failed", purpose }));
      return false;
    }
  }
  function validToken(token, purpose, hashed = false) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new AppError("This link is invalid or expired. Request a new one.");
    const row = db
      .prepare(
        "SELECT * FROM auth_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>?",
      )
      .get(hashed ? token : hashToken(token), purpose, Date.now());
    if (!row || repo.byId(row.user_id)?.status !== "active")
      throw new AppError("This link is invalid or expired. Request a new one.");
    return row;
  }
  return {
    async register(data) {
      const hash = await hashPassword(data.password);
      let id;
      try {
        id = repo.create(data.email, data.displayName, hash);
      } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
          throw new AppError(
            "An account with this email already exists. Log in or reset your password.",
            409,
          );
        throw error;
      }
      const delivered = await deliver(repo.byId(id), "verification");
      return { delivered };
    },
    async login(email, password) {
      const user = repo.byEmail(email);
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
    async resend(id) {
      const user = repo.byId(id);
      if (!user || user.status !== "active" || user.verified_at)
        throw new AppError("Verification is unavailable for this account.");
      return deliver(user, "verification");
    },
    verify(token, { hashed = false } = {}) {
      db.transaction(() => {
        const row = validToken(token, "verification", hashed);
        db.prepare(
          "UPDATE users SET verified_at=?, updated_at=? WHERE id=?",
        ).run(Date.now(), Date.now(), row.user_id);
        db.prepare("UPDATE auth_tokens SET used_at=? WHERE id=?").run(
          Date.now(),
          row.id,
        );
      }).immediate();
    },
    async recover(email) {
      const user = repo.byEmail(email);
      if (user?.status === "active" && user.password_hash)
        await deliver(user, "reset");
    },
    async reset(token, password, { hashed = false } = {}) {
      validToken(token, "reset", hashed);
      const hash = await hashPassword(password);
      db.transaction(() => {
        const row = validToken(token, "reset", hashed);
        db.prepare(
          "UPDATE users SET password_hash=?,updated_at=?,auth_version=auth_version+1 WHERE id=?",
        ).run(hash, Date.now(), row.user_id);
        db.prepare(
          "UPDATE auth_tokens SET used_at=? WHERE user_id=? AND purpose='reset' AND used_at IS NULL",
        ).run(Date.now(), row.user_id);
        repo.revoke(row.user_id);
      }).immediate();
    },
  };
}
