import { PrismaClient, Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

export type Database = PrismaClient;
export type DbClient = PrismaClient | Prisma.TransactionClient;
export const timestamp = () => BigInt(Date.now());
export function databaseUrl(filename: string) {
  return `file:${path.resolve(filename).replaceAll("\\", "/")}`;
}
export async function openDatabase(filename: string) {
  fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new PrismaClient({
    datasources: { db: { url: databaseUrl(filename) } },
  });
  try {
    await db.$connect();
    await db.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await db.$queryRawUnsafe("PRAGMA foreign_keys = ON");
    await db.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
    return db;
  } catch (error) {
    await db.$disconnect();
    throw error;
  }
}

// Acquire SQLite's writer lock before any policy read. A deferred read/check/write
// transaction alone would allow competing last-admin checks to see stale state.
export function writeTransaction<T>(
  db: Database,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`UPDATE users SET id = id WHERE id = -1`;
      return work(tx);
    },
    { maxWait: 10000, timeout: 10000 },
  );
}
