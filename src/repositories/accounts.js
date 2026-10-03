export function accounts(db) {
  return {
    byId: (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id),
    byEmail: (email) =>
      db.prepare("SELECT * FROM users WHERE email=?").get(email),
    create: (email, name, hash) =>
      Number(
        db
          .prepare(
            "INSERT INTO users(email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)",
          )
          .run(email, name, hash, Date.now(), Date.now()).lastInsertRowid,
      ),
    audit: (actor, action, target, summary) =>
      db
        .prepare(
          "INSERT INTO audit_events(actor_id,action,target_type,target_id,summary,created_at) VALUES (?,?,'user',?,?,?)",
        )
        .run(actor, action, target, summary, Date.now()),
    revoke: (id) =>
      db
        .prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userId')=?")
        .run(id),
  };
}
