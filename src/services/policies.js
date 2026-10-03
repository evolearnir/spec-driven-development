import { accounts } from "../repositories/accounts.js";
import { AppError } from "./errors.js";

export const licenses = ["MIT", "Apache-2.0", "CC-BY-4.0", "CC0-1.0"];
export function policies(db) {
  const repo = accounts(db);
  function actor(id) {
    const user = repo.byId(id);
    if (!user || user.status !== "active")
      throw new AppError("Sign in with an active account.", 403);
    return user;
  }
  function admin(id) {
    const user = actor(id);
    if (user.role !== "admin")
      throw new AppError("Administrator access is required.", 403);
    return user;
  }
  function skill(id) {
    const row = db.prepare("SELECT * FROM skills WHERE id=?").get(id);
    if (!row) throw new AppError("Skill not found.", 404);
    return row;
  }
  function owner(id, row) {
    const user = actor(id);
    if (user.role !== "admin" && user.id !== row.owner_id)
      throw new AppError("Skill access denied.", 403);
    return user;
  }
  return {
    admin,
    readSkill(id, actorId = null) {
      const row = skill(id);
      if (
        row.status === "published" &&
        repo.byId(row.owner_id)?.status === "active"
      )
        return row;
      owner(actorId, row);
      return row;
    },
    assertOwner(actorId, skillId) {
      return owner(actorId, skill(skillId));
    },
    assertPublish(actorId, skillId) {
      const row = skill(skillId);
      const user = owner(actorId, row);
      const creator = repo.byId(row.owner_id);
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
        "slug",
        "title",
        "summary",
        "description",
        "body",
        "usage_instructions",
        "version_label",
      ];
      if (
        required.some((key) => !row[key]?.trim()) ||
        !row.category_id ||
        !licenses.includes(row.license) ||
        !db
          .prepare("SELECT 1 FROM skill_supported_tools WHERE skill_id=?")
          .get(row.id)
      )
        throw new AppError("Complete required publication metadata.");
      return row;
    },
    changeAccount(actorId, targetId, change) {
      return db
        .transaction(() => {
          admin(actorId);
          const target = repo.byId(targetId);
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
            const count = db
              .prepare(
                "SELECT count(*) AS n FROM users WHERE role='admin' AND status='active'",
              )
              .get().n;
            if (count <= 1)
              throw new AppError(
                "The final active administrator cannot be removed.",
                409,
              );
          }
          if (deleting) {
            if (!["delete", "reassign"].includes(change.skills))
              throw new AppError(
                "Explicitly choose skill deletion or reassignment.",
              );
            if (change.skills === "reassign") {
              const destination = actor(change.newOwnerId);
              if (destination.id === target.id)
                throw new AppError("Choose a different active owner.");
              db.prepare(
                "UPDATE skills SET owner_id=?,status='draft',updated_at=? WHERE owner_id=?",
              ).run(destination.id, Date.now(), target.id);
            } else
              db.prepare("DELETE FROM skills WHERE owner_id=?").run(target.id);
            repo.revoke(target.id);
            // Delete the user's identifying historical audit link; summaries never contain personal data.
            db.prepare(
              "UPDATE audit_events SET actor_id=NULL WHERE actor_id=?",
            ).run(target.id);
            repo.audit(
              actorId === targetId ? null : actorId,
              "account_deleted",
              target.id,
              `skills:${change.skills}`,
            );
            db.prepare("DELETE FROM users WHERE id=?").run(target.id);
          } else {
            db.prepare(
              "UPDATE users SET role=?,status=?,updated_at=?,auth_version=auth_version+? WHERE id=?",
            ).run(
              role,
              status,
              Date.now(),
              status !== target.status ? 1 : 0,
              target.id,
            );
            if (status !== target.status) repo.revoke(target.id);
            repo.audit(
              actorId,
              "account_updated",
              target.id,
              `role:${role};status:${status}`,
            );
          }
        })
        .immediate();
    },
  };
}
