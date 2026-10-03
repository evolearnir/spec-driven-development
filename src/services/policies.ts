import type { Skill } from "@prisma/client";
import { accounts } from "../repositories/accounts.js";
import {
  writeTransaction,
  timestamp,
  type Database,
  type DbClient,
} from "../db/connection.js";
import { AppError } from "./errors.js";

export const licenses = ["MIT", "Apache-2.0", "CC-BY-4.0", "CC0-1.0"];
export interface AccountChange {
  operation: "update" | "delete";
  role?: "user" | "admin";
  status?: "active" | "suspended" | "invited";
  skills?: "delete" | "reassign";
  newOwnerId?: number;
}
export function policies(db: Database) {
  async function actor(client: DbClient, id?: number | null) {
    const user = id == null ? null : await accounts(client).byId(id);
    if (!user || user.status !== "active")
      throw new AppError("Sign in with an active account.", 403);
    return user;
  }
  async function admin(client: DbClient, id: number) {
    const user = await actor(client, id);
    if (user.role !== "admin")
      throw new AppError("Administrator access is required.", 403);
    return user;
  }
  async function skill(id: number) {
    const row = await db.skill.findUnique({ where: { id } });
    if (!row) throw new AppError("Skill not found.", 404);
    return row;
  }
  async function owner(id: number | null, row: Skill) {
    const user = await actor(db, id);
    if (user.role !== "admin" && user.id !== row.owner_id)
      throw new AppError("Skill access denied.", 403);
    return user;
  }
  return {
    admin: (id: number) => admin(db, id),
    async readSkill(id: number, actorId: number | null = null) {
      const row = await skill(id);
      if (
        row.status === "published" &&
        (await accounts(db).byId(row.owner_id))?.status === "active"
      )
        return row;
      await owner(actorId, row);
      return row;
    },
    async assertOwner(actorId: number, skillId: number) {
      return owner(actorId, await skill(skillId));
    },
    async assertPublish(actorId: number, skillId: number) {
      const row = await skill(skillId);
      const user = await owner(actorId, row);
      const creator = await accounts(db).byId(row.owner_id);
      if (
        !user.verified_at ||
        creator?.status !== "active" ||
        !creator.verified_at
      )
        throw new AppError(
          "Publication requires verified active accounts.",
          403,
        );
      const required = [
        row.slug,
        row.title,
        row.summary,
        row.description,
        row.body,
        row.usage_instructions,
        row.version_label,
      ];
      if (
        required.some((value) => !value.trim()) ||
        !row.category_id ||
        !licenses.includes(row.license) ||
        !(await db.skillSupportedTool.findFirst({
          where: { skill_id: row.id },
        }))
      )
        throw new AppError("Complete required publication metadata.");
      return row;
    },
    async changeAccount(
      actorId: number,
      targetId: number,
      change: AccountChange,
    ) {
      return writeTransaction(db, async (tx) => {
        const repo = accounts(tx);
        await admin(tx, actorId);
        const target = await repo.byId(targetId);
        if (!target) throw new AppError("Account not found.", 404);
        const deleting = change.operation === "delete";
        if (!deleting && change.operation !== "update")
          throw new AppError("Choose update or delete.");
        const role = change.role ?? target.role;
        const status = change.status ?? target.status;
        if (
          !["user", "admin"].includes(role) ||
          !["active", "suspended", "invited"].includes(status)
        )
          throw new AppError("Invalid account state.");
        if (
          target.role === "admin" &&
          target.status === "active" &&
          (deleting || role !== "admin" || status !== "active")
        ) {
          if (
            (await tx.user.count({
              where: { role: "admin", status: "active" },
            })) <= 1
          )
            throw new AppError(
              "The final active administrator cannot be removed.",
              409,
            );
        }
        if (deleting) {
          if (!change.skills || !["delete", "reassign"].includes(change.skills))
            throw new AppError(
              "Explicitly choose skill deletion or reassignment.",
            );
          if (change.skills === "reassign") {
            const destination = await actor(tx, change.newOwnerId);
            if (destination.id === target.id)
              throw new AppError("Choose a different active owner.");
            await tx.skill.updateMany({
              where: { owner_id: target.id },
              data: {
                owner_id: destination.id,
                status: "draft",
                updated_at: timestamp(),
              },
            });
          } else await tx.skill.deleteMany({ where: { owner_id: target.id } });
          await repo.revoke(target.id);
          await tx.auditEvent.updateMany({
            where: { actor_id: target.id },
            data: { actor_id: null },
          });
          await repo.audit(
            actorId === targetId ? null : actorId,
            "account_deleted",
            target.id,
            `skills:${change.skills}`,
          );
          await tx.user.delete({ where: { id: target.id } });
        } else {
          await tx.user.update({
            where: { id: target.id },
            data: {
              role,
              status,
              updated_at: timestamp(),
              auth_version: { increment: status !== target.status ? 1 : 0 },
            },
          });
          if (status !== target.status) await repo.revoke(target.id);
          await repo.audit(
            actorId,
            "account_updated",
            target.id,
            `role:${role};status:${status}`,
          );
        }
      });
    },
  };
}
