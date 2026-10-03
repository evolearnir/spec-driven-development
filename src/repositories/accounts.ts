import type { DbClient } from "../db/connection.js";
import { timestamp } from "../db/connection.js";

export function accounts(db: DbClient) {
  return {
    byId: (id: number) => db.user.findUnique({ where: { id } }),
    byEmail: (email: string) => db.user.findUnique({ where: { email } }),
    create: (email: string, name: string, hash: string) =>
      db.user.create({
        data: {
          email,
          display_name: name,
          password_hash: hash,
          created_at: timestamp(),
          updated_at: timestamp(),
        },
      }),
    audit: (
      actor: number | null,
      action: string,
      target: number,
      summary: string,
    ) =>
      db.auditEvent.create({
        data: {
          actor_id: actor,
          action,
          target_type: "user",
          target_id: target,
          summary,
          created_at: timestamp(),
        },
      }),
    // SQLite JSON filtering is kept parameterized; Prisma owns this transaction.
    revoke: (id: number) =>
      db.$executeRaw`DELETE FROM sessions WHERE json_extract(sess, '$.userId') = ${id}`,
  };
}
