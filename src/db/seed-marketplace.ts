import { writeTransaction, type Database } from "./connection.js";

const titles = [
  "Review a pull request",
  "Explain unfamiliar code",
  "Plan a refactor",
  "Write API documentation",
  "Debug a failing build",
  "Design a test strategy",
  "Edit a clear article",
  "Draft a product announcement",
  "Rewrite for plain language",
  "Outline a technical guide",
  "Polish a project proposal",
  "Create a style guide",
  "Compare primary sources",
  "Summarize research findings",
  "Build a literature map",
  "Check a factual claim",
  "Prepare interview questions",
  "Explore competing hypotheses",
  "Turn notes into actions",
  "Plan a focused workweek",
  "Prepare a meeting agenda",
  "Organize project handoffs",
  "Prioritize a task backlog",
  "Write a decision record",
  "Review interface accessibility",
  "Define design tokens",
  "Evaluate a page hierarchy",
  "Write helpful form labels",
  "Plan responsive layouts",
  "Audit a component library",
];

export async function seedMarketplace(db: Database, passwordHash: string) {
  await writeTransaction(db, async (tx) => {
    const categories = [];
    const tools = [];
    for (const slug of [
      "development",
      "writing",
      "research",
      "productivity",
      "design",
    ])
      categories.push(await tx.category.findUniqueOrThrow({ where: { slug } }));
    for (const name of ["Claude", "ChatGPT", "Gemini", "Other"])
      tools.push(await tx.supportedTool.findUniqueOrThrow({ where: { name } }));
    const now = BigInt(Date.UTC(2026, 9, 1));
    const creators = [];
    for (const [index, name] of [
      "Morgan Studio",
      "Alex Workshop",
      "Sam Research",
    ].entries()) {
      creators.push(
        await tx.user.upsert({
          where: { email: `catalog-${index}@fixtures.example.test` },
          update: {},
          create: {
            email: `catalog-${index}@fixtures.example.test`,
            display_name: name,
            password_hash: passwordHash,
            status: "active",
            verified_at: now,
            created_at: now,
            updated_at: now,
          },
        }),
      );
    }
    const tagNames = [
      "workflow",
      "beginner",
      "advanced",
      "review",
      "evidence",
      "tag-only-discovery",
    ];
    const tags = [];
    for (const name of tagNames)
      tags.push(
        await tx.tag.upsert({ where: { name }, update: {}, create: { name } }),
      );
    const licenses = ["MIT", "Apache-2.0", "CC-BY-4.0", "CC0-1.0"];
    for (const [index, title] of titles.entries()) {
      const slug = `sample-${title.toLowerCase().replaceAll(" ", "-")}`;
      if (await tx.skill.findUnique({ where: { slug } })) continue;
      await tx.skill.create({
        data: {
          slug,
          title,
          summary: `A structured approach to ${title.toLowerCase()}, with clear questions and practical next steps.`,
          description: `Use this instruction package to ${title.toLowerCase()}. Adapt the scope and examples to your own project. Review the assistant's output before using it.`,
          body: `# ${title}\n\nYou are a thoughtful collaborator. Help me ${title.toLowerCase()}.\n\n1. Ask about the goal, audience and constraints.\n2. Identify gaps before making recommendations.\n3. Provide a clear, actionable result.\n\n## Output format\n\n\`\`\`text\nGoal: ...\nObservations: ...\nNext steps: ...\n\`\`\`\n\nExplain your assumptions and flag uncertainties.`,
          usage_instructions:
            "## Getting started\n\n- Copy the skill instructions into your AI assistant.\n- Describe your project and provide relevant context.\n- Review the result and ask for adjustments.\n\nSee [Markdown guidance](https://commonmark.org/help/) for formatting examples.",
          owner_id: creators[index % creators.length].id,
          category_id: categories[Math.floor(index / 6)].id,
          version_label: "1.0.0",
          license: licenses[index % licenses.length],
          status: "published",
          featured: index % 5 === 0,
          created_at: now + BigInt(Math.floor(index / 2) * 60000),
          updated_at:
            now + BigInt((Math.floor(index / 2) + (index % 7)) * 60000),
          tags: {
            create: [
              { tag_id: tags[0].id },
              { tag_id: tags[1 + (index % (tags.length - 1))].id },
            ],
          },
          tools: { create: [{ tool_id: tools[index % tools.length].id }] },
          links: {
            create: {
              type: "documentation",
              url: "https://commonmark.org/help/",
            },
          },
        },
      });
    }
    for (const [slug, status, ownerEmail] of [
      ["sample-private-draft", "draft", "catalog-0@fixtures.example.test"],
      ["sample-suspended-owner", "published", "c@fixtures.example.test"],
      ["sample-invited-owner", "published", "d@fixtures.example.test"],
    ]) {
      if (await tx.skill.findUnique({ where: { slug } })) continue;
      const owner = await tx.user.findUniqueOrThrow({
        where: { email: ownerEmail },
      });
      await tx.skill.create({
        data: {
          slug,
          title: "Private fixture",
          summary: "Private fixture summary",
          body: "Private fixture instructions",
          status,
          owner_id: owner.id,
          created_at: now,
          updated_at: now,
        },
      });
    }
    for (const [slug, title] of [
      ["sample-title-tie-a", "Compare a workflow"],
      ["sample-title-tie-b", "compare a workflow"],
    ]) {
      if (await tx.skill.findUnique({ where: { slug } })) continue;
      await tx.skill.create({
        data: {
          slug,
          title,
          summary:
            "Compare two approaches using explicit constraints and evidence.",
          description:
            "A focused workflow comparison with deterministic title/date ties for development checks.",
          body: "# Compare a workflow\n\n1. Describe both approaches.\n2. Define your constraints.\n3. Compare tradeoffs and recommend next steps.\n",
          usage_instructions:
            "Copy the instructions into your assistant and describe the two workflows.",
          owner_id: creators[0].id,
          category_id: categories[3].id,
          version_label: "1.0.0",
          license: "MIT",
          status: "published",
          created_at: now,
          updated_at: now,
          tags: { create: { tag_id: tags[0].id } },
          tools: { create: { tool_id: tools[0].id } },
        },
      });
    }
    const slug = "sample-safe-markdown";
    if (!(await tx.skill.findUnique({ where: { slug } })))
      await tx.skill.create({
        data: {
          slug,
          title: 'Escaping "quotes" & <markup>',
          summary: 'A safety fixture with 100% literal_underlines & "quotes".',
          description: "Check literal search and instruction rendering.",
          body:
            '\n# Safe rendering\r\n\r\n<script>alert("never")</script>\n\n[unsafe](javascript:alert(1))\n\n![remote](https://example.test/image.png)\n\n```text\n' +
            "long-code-token-".repeat(100) +
            "\n```\n",
          usage_instructions:
            "1. Read the example.\n2. Copy the original text manually or with the copy button.",
          owner_id: creators[0].id,
          category_id: categories[0].id,
          version_label: "1.0.0",
          license: "MIT",
          status: "published",
          created_at: now,
          updated_at: now,
          tags: { create: { tag_id: tags[0].id } },
          tools: { create: { tool_id: tools[0].id } },
          links: { create: { type: "source", url: "https://[invalid" } },
        },
      });
  });
}
