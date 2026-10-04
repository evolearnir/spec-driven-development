import { Prisma } from "@prisma/client";
import type { Database } from "../db/connection.js";
import type { CatalogQuery } from "../validators/catalog.js";

export const publicSkills = {
  status: "published",
  owner: { status: "active" },
} satisfies Prisma.SkillWhereInput;
const cardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  category: { select: { name: true, slug: true } },
  owner: { select: { display_name: true } },
  tags: { select: { tag: { select: { name: true } } } },
  tools: { select: { tool: { select: { name: true } } } },
} satisfies Prisma.SkillSelect;
export function skillsRepository(db: Database) {
  return {
    async taxonomy() {
      const [categories, tags, tools] = await Promise.all([
        db.category.findMany({
          select: { slug: true, name: true },
          orderBy: { name: "asc" },
        }),
        db.tag.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
        db.supportedTool.findMany({
          select: { name: true },
          orderBy: { name: "asc" },
        }),
      ]);
      return { categories, tags, tools };
    },
    async landing() {
      return db.$transaction(async (tx) => ({
        featured: await tx.skill.findMany({
          where: { ...publicSkills, featured: true },
          select: cardSelect,
          take: 6,
          orderBy: [{ created_at: "desc" }, { id: "asc" }],
        }),
        latest: await tx.skill.findMany({
          where: publicSkills,
          select: cardSelect,
          take: 6,
          orderBy: [{ created_at: "desc" }, { id: "asc" }],
        }),
      }));
    },
    async catalog(query: CatalogQuery) {
      // SQLite LOWER is ASCII case-insensitive. INSTR treats %, _ and SQL syntax
      // literally. Prisma cannot express INSTR or LOWER title ordering; all values
      // are bound and sort expressions are a closed, static whitelist.
      const predicates = [
        Prisma.sql`s.status = 'published' AND EXISTS (SELECT 1 FROM users u WHERE u.id = s.owner_id AND u.status = 'active')`,
      ];
      if (query.q)
        predicates.push(
          Prisma.sql`(instr(lower(s.title), lower(${query.q})) > 0 OR instr(lower(s.summary), lower(${query.q})) > 0 OR EXISTS (SELECT 1 FROM skill_tags st JOIN tags t ON t.id = st.tag_id WHERE st.skill_id = s.id AND instr(lower(t.name), lower(${query.q})) > 0))`,
        );
      if (query.category)
        predicates.push(
          Prisma.sql`EXISTS (SELECT 1 FROM categories c WHERE c.id = s.category_id AND c.slug = ${query.category})`,
        );
      if (query.tag)
        predicates.push(
          Prisma.sql`EXISTS (SELECT 1 FROM skill_tags st JOIN tags t ON t.id = st.tag_id WHERE st.skill_id = s.id AND t.name = ${query.tag})`,
        );
      if (query.tool)
        predicates.push(
          Prisma.sql`EXISTS (SELECT 1 FROM skill_supported_tools st JOIN supported_tools t ON t.id = st.tool_id WHERE st.skill_id = s.id AND t.name = ${query.tool})`,
        );
      const where = Prisma.join(predicates, " AND ");
      const order =
        query.sort === "title"
          ? Prisma.sql`lower(s.title) ASC, s.id ASC`
          : query.sort === "updated"
            ? Prisma.sql`s.updated_at DESC, s.id ASC`
            : Prisma.sql`s.created_at DESC, s.id ASC`;
      return db.$transaction(async (tx) => {
        const [count] = await tx.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT count(*) AS total FROM skills s WHERE ${where}`,
        );
        const ids = await tx.$queryRaw<{ id: number }[]>(
          Prisma.sql`SELECT s.id FROM skills s WHERE ${where} ORDER BY ${order} LIMIT 12 OFFSET ${(query.page - 1) * 12}`,
        );
        const records = await tx.skill.findMany({
          where: { ...publicSkills, id: { in: ids.map((row) => row.id) } },
          select: cardSelect,
        });
        const byId = new Map(records.map((record) => [record.id, record]));
        return {
          total: Number(count.total),
          records: ids.flatMap((row) => {
            const record = byId.get(row.id);
            return record ? [record] : [];
          }),
        };
      });
    },
    detail(slug: string) {
      return db.skill.findFirst({
        where: { ...publicSkills, slug },
        select: {
          ...cardSelect,
          description: true,
          body: true,
          usage_instructions: true,
          license: true,
          version_label: true,
          created_at: true,
          updated_at: true,
          links: { select: { type: true, url: true } },
        },
      });
    },
    sitemap() {
      return db.skill.findMany({
        where: publicSkills,
        select: { slug: true, updated_at: true },
        orderBy: { id: "asc" },
      });
    },
  };
}
