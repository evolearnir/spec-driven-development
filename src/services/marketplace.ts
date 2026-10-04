import type { Database } from "../db/connection.js";
import { skillsRepository } from "../repositories/skills.js";
import { AppError } from "./errors.js";
import { renderMarkdown, safeExternalUrl } from "./markdown.js";
import type { CatalogQuery } from "../validators/catalog.js";

export function marketplace(db: Database) {
  const repository = skillsRepository(db);
  return {
    ...repository,
    async catalog(query: CatalogQuery) {
      const result = await repository.catalog(query);
      const pages = Math.max(1, Math.ceil(result.total / 12));
      if (query.page > pages) throw new AppError("Page not found.", 404);
      return { ...result, pages };
    },
    async detail(slug: string) {
      const skill = await repository.detail(slug);
      if (!skill) throw new AppError("Page not found.", 404);
      return {
        ...skill,
        bodyHtml: renderMarkdown(skill.body),
        usageHtml: renderMarkdown(skill.usage_instructions),
        links: skill.links.flatMap((link) => {
          const url = safeExternalUrl(link.url);
          return url ? [{ type: link.type, url }] : [];
        }),
        created: new Date(Number(skill.created_at)).toISOString().slice(0, 10),
        updated: new Date(Number(skill.updated_at)).toISOString().slice(0, 10),
      };
    },
  };
}
