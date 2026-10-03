import { z } from "zod";
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");
export const registration = z.object({
  email,
  displayName: z.string().trim().min(2).max(80),
  password,
});
export const login = z.object({ email, password: z.string().min(1).max(128) });
export const recovery = z.object({ email });
export const reset = z.object({ password });
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
):
  | { data: T; errors?: never }
  | { data?: never; errors: Record<string, string> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { data: parsed.data };
  return {
    errors: Object.fromEntries(
      parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message]),
    ),
  };
}
