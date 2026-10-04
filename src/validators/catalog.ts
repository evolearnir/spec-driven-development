import { z } from "zod";
import { AppError } from "../services/errors.js";

const schema = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.string().trim().default(""),
  tag: z.string().trim().default(""),
  tool: z.string().trim().default(""),
  sort: z.enum(["newest", "updated", "title"]).default("newest"),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(10000))
    .default(1),
});
export type CatalogQuery = z.infer<typeof schema>;
export type Taxonomy = {
  categories: { slug: string; name: string }[];
  tags: { name: string }[];
  tools: { name: string }[];
};
export function parseCatalog(
  params: URLSearchParams,
  taxonomy: Taxonomy,
): CatalogQuery {
  const input: Record<string, string> = {};
  for (const key of ["q", "category", "tag", "tool", "sort", "page"]) {
    const values = params.getAll(key);
    if (values.length > 1)
      throw new AppError("Use each catalog parameter only once.", 400);
    if (values.length && values[0].trim()) input[key] = values[0];
  }
  // Bracket notation is nonscalar input, rather than an ignorable tracking key.
  for (const key of params.keys()) {
    if (/^(q|category|tag|tool|sort|page)\[/.test(key))
      throw new AppError("Catalog parameters must be single values.", 400);
  }
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(
      "Check your filters: search is limited to 100 characters, sort must be newest, updated or title, and page must be 1–10000.",
      400,
    );
  const query = result.data;
  if (
    (query.category &&
      !taxonomy.categories.some((c) => c.slug === query.category)) ||
    (query.tag && !taxonomy.tags.some((t) => t.name === query.tag)) ||
    (query.tool && !taxonomy.tools.some((t) => t.name === query.tool))
  ) {
    throw new AppError(
      "That category, tag or tool is unavailable. Browse skills to choose an existing filter.",
      400,
    );
  }
  return query;
}
export function catalogUrl(query: CatalogQuery, page = query.page) {
  const params = new URLSearchParams();
  for (const key of ["q", "category", "tag", "tool"] as const)
    if (query[key]) params.set(key, query[key]);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (page !== 1) params.set("page", String(page));
  return `/skills${params.size ? `?${params}` : ""}`;
}
