import session from "express-session";
import type { Database } from "../db/connection.js";
import type { Config } from "../config/env.js";

type Callback = (error?: unknown) => void;
class PrismaSessionStore extends session.Store {
  constructor(private readonly db: Database) {
    super();
  }
  override get(
    sid: string,
    callback: (error: unknown, value?: session.SessionData | null) => void,
  ) {
    this.db.session
      .findUnique({ where: { sid } })
      .then(async (row) => {
        if (!row) return callback(null, null);
        if (row.expired <= BigInt(Date.now())) {
          await this.db.session.deleteMany({
            where: { sid, expired: { lte: BigInt(Date.now()) } },
          });
          return callback(null, null);
        }
        callback(null, JSON.parse(row.sess) as session.SessionData);
      })
      .catch(callback);
  }
  override set(
    sid: string,
    value: session.SessionData,
    callback: Callback = () => {},
  ) {
    const data = {
      sess: JSON.stringify(value),
      expired: BigInt(
        value.cookie.expires
          ? new Date(value.cookie.expires).getTime()
          : Date.now() + 7 * 86400000,
      ),
    };
    this.db.session
      .upsert({ where: { sid }, create: { sid, ...data }, update: data })
      .then(() => callback())
      .catch(callback);
  }
  override destroy(sid: string, callback: Callback = () => {}) {
    this.db.session
      .deleteMany({ where: { sid } })
      .then(() => callback())
      .catch(callback);
  }
  override touch(
    sid: string,
    value: session.SessionData,
    callback: Callback = () => {},
  ) {
    this.db.session
      .updateMany({
        where: { sid },
        data: {
          expired: BigInt(
            value.cookie.expires
              ? new Date(value.cookie.expires).getTime()
              : Date.now() + 7 * 86400000,
          ),
        },
      })
      .then(() => callback())
      .catch(callback);
  }
}
export async function createSessionStore(db: Database) {
  await db.session.deleteMany({
    where: { expired: { lte: BigInt(Date.now()) } },
  });
  return { store: new PrismaSessionStore(db), close: async () => {} };
}
export function sessionMiddleware(config: Config, store: session.Store) {
  return session({
    name: "skillmart.sid",
    secret: config.SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.secureCookies,
      maxAge: 7 * 86400000,
    },
  });
}
