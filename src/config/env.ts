import "dotenv/config";
import { z } from "zod";
import path from "node:path";

const boolean = z.enum(["true", "false"]).transform((v) => v === "true");
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.url().refine((v) => /^https?:\/\//.test(v), "Use HTTP or HTTPS"),
  DATABASE_PATH: z.string().min(1),
  SESSION_SECRET: z.string().min(48),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: boolean.default(false),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  EMAIL_FROM: z.string().min(1),
  BACKUP_DIR: z.string().default("./backups"),
});

export function loadConfig(
  input: Record<string, string | undefined> = process.env,
) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid configuration: ${[...new Set(result.error.issues.map((i) => i.path.join(".")))].join(", ")}. Check .env.example (SESSION_SECRET needs 48+ characters).`,
    );
  }
  const config = result.data;
  if (
    config.NODE_ENV === "production" &&
    (!config.APP_URL.startsWith("https://") ||
      !path.isAbsolute(config.DATABASE_PATH))
  ) {
    throw new Error(
      "Production requires HTTPS APP_URL and absolute DATABASE_PATH.",
    );
  }
  config.APP_URL = new URL(config.APP_URL).origin;
  return { ...config, secureCookies: config.APP_URL.startsWith("https://") };
}
export type Config = ReturnType<typeof loadConfig>;
