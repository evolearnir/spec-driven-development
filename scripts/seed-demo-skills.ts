import { randomBytes } from "node:crypto";
import { loadConfig } from "../src/config/env.js";
import {
  openDatabase,
  timestamp,
  writeTransaction,
} from "../src/db/connection.js";
import { hashPassword } from "../src/services/auth.js";

// Requested local demo inventory: 100 published skills, without auth/private
// acceptance fixtures. Stable slugs make reruns safe and preserve operator edits.
const groups = [
  {
    category: "development",
    tasks: [
      "Review TypeScript code",
      "Design REST endpoints",
      "Debug SQL queries",
      "Write unit tests",
      "Refactor legacy modules",
      "Explain a codebase",
      "Optimize database indexes",
      "Document an API",
      "Review dependency updates",
      "Plan a database migration",
      "Improve error handling",
      "Analyze application logs",
      "Design a caching strategy",
      "Check authentication flows",
      "Write integration tests",
      "Create a CLI tool",
      "Audit frontend performance",
      "Review pull request changes",
      "Design a data model",
      "Plan a deployment checklist",
    ],
  },
  {
    category: "writing",
    tasks: [
      "Draft a technical article",
      "Edit for plain language",
      "Write a product announcement",
      "Create an article outline",
      "Polish a project proposal",
      "Write release notes",
      "Develop a brand voice",
      "Rewrite a help article",
      "Draft an onboarding email",
      "Improve a landing page headline",
      "Summarize a long document",
      "Write a case study",
      "Review grammar and clarity",
      "Create a newsletter draft",
      "Write a professional biography",
      "Prepare a presentation script",
      "Turn notes into a report",
      "Write an FAQ",
      "Create a documentation style guide",
      "Adapt copy for a new audience",
    ],
  },
  {
    category: "research",
    tasks: [
      "Compare primary sources",
      "Summarize research papers",
      "Build a literature review",
      "Check factual claims",
      "Prepare interview questions",
      "Analyze survey responses",
      "Map competing hypotheses",
      "Create a research plan",
      "Evaluate source credibility",
      "Extract key findings",
      "Compare market trends",
      "Build an evidence table",
      "Identify research gaps",
      "Review a study methodology",
      "Organize research notes",
      "Explore a new topic",
      "Prepare a competitor analysis",
      "Synthesize interview findings",
      "Draft a research brief",
      "Assess uncertainty in conclusions",
    ],
  },
  {
    category: "productivity",
    tasks: [
      "Plan a focused workweek",
      "Turn meeting notes into actions",
      "Prioritize a task backlog",
      "Create a meeting agenda",
      "Organize project handoffs",
      "Write a decision record",
      "Break down a large project",
      "Prepare a daily work plan",
      "Review weekly progress",
      "Set measurable goals",
      "Build a personal knowledge system",
      "Plan a learning schedule",
      "Identify workflow bottlenecks",
      "Create a project checklist",
      "Draft a status update",
      "Prepare for a planning session",
      "Organize incoming requests",
      "Review a recurring process",
      "Plan a team retrospective",
      "Create a timeboxing plan",
    ],
  },
  {
    category: "design",
    tasks: [
      "Review interface accessibility",
      "Define design tokens",
      "Evaluate page hierarchy",
      "Write helpful form labels",
      "Plan responsive layouts",
      "Audit a component library",
      "Review color contrast",
      "Design an empty state",
      "Improve navigation labels",
      "Plan a user journey",
      "Review a checkout flow",
      "Create a wireframe brief",
      "Evaluate typography choices",
      "Design an error message",
      "Review mobile usability",
      "Plan a design system",
      "Prepare a usability study",
      "Improve dashboard information density",
      "Review keyboard interactions",
      "Document component states",
    ],
  },
] as const;

const config = loadConfig();
if (config.NODE_ENV !== "development" || process.env.SEED_ENABLED !== "true")
  throw new Error(
    "Demo skills require NODE_ENV=development and SEED_ENABLED=true.",
  );

const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
const db = await openDatabase(config.DATABASE_PATH);
try {
  const before = await db.skill.count();
  const created = await writeTransaction(db, async (tx) => {
    const now = timestamp();
    const tools = [];
    for (const name of ["Claude", "ChatGPT", "Gemini", "Other"])
      tools.push(await tx.supportedTool.findUniqueOrThrow({ where: { name } }));
    const creators = [];
    for (const [index, displayName] of [
      "Demo Developer",
      "Demo Writer",
      "Demo Researcher",
      "Demo Organizer",
      "Demo Designer",
    ].entries()) {
      creators.push(
        await tx.user.upsert({
          where: { email: `demo-creator-${index + 1}@fixtures.example.test` },
          update: {},
          create: {
            email: `demo-creator-${index + 1}@fixtures.example.test`,
            display_name: displayName,
            password_hash: passwordHash,
            status: "active",
            role: "user",
            verified_at: now,
            created_at: now,
            updated_at: now,
          },
        }),
      );
    }
    const tags = [];
    for (const name of ["demo", "beginner", "advanced", "workflow", "review"])
      tags.push(
        await tx.tag.upsert({ where: { name }, update: {}, create: { name } }),
      );
    const licenses = ["MIT", "Apache-2.0", "CC-BY-4.0", "CC0-1.0"];
    let inserted = 0;
    let number = 0;
    for (const [groupIndex, group] of groups.entries()) {
      const category = await tx.category.findUniqueOrThrow({
        where: { slug: group.category },
      });
      for (const title of group.tasks) {
        number++;
        const slug = `demo-${String(number).padStart(3, "0")}-${title.toLowerCase().replaceAll(" ", "-")}`;
        if (await tx.skill.findUnique({ where: { slug } })) continue;
        const createdAt = now - BigInt((100 - number) * 3600000);
        await tx.skill.create({
          data: {
            slug,
            title,
            summary: `A reusable instruction package to help you ${title.toLowerCase()} with clear steps and practical outputs.`,
            description: `This dummy skill demonstrates a ${category.name.toLowerCase()} workflow. Use it to explore the marketplace, filtering, Markdown rendering and copying. Adapt the instructions to your own context and review the assistant's output.`,
            body: `# ${title}\n\nAct as a careful ${category.name.toLowerCase()} collaborator. Help me ${title.toLowerCase()}.\n\n## Process\n\n1. Ask for the goal, audience, relevant context and constraints.\n2. Identify missing information and state your assumptions.\n3. Work through the task in clear, manageable steps.\n4. Provide a practical result with examples where useful.\n5. Finish with a short checklist of recommended next steps.\n\n## Output format\n\n\`\`\`text\nGoal: ...\nContext: ...\nFindings: ...\nRecommendations: ...\nNext steps: ...\n\`\`\`\n\nDo not invent facts or claim actions were performed. Flag uncertain points for review.\n`,
            usage_instructions: `## Use this skill\n\n1. Copy the original skill instructions.\n2. Paste them into your preferred AI assistant.\n3. Describe the ${category.name.toLowerCase()} task and provide relevant materials.\n4. Review the result and ask for refinements.\n\n**Demo data:** compatibility is creator-declared, not independently certified.`,
            owner_id: creators[groupIndex].id,
            category_id: category.id,
            version_label: "1.0.0",
            license: licenses[(number - 1) % licenses.length],
            status: "published",
            featured: number % 10 === 1,
            created_at: createdAt,
            updated_at: createdAt + BigInt((number % 5) * 60000),
            tags: {
              create: [
                { tag_id: tags[0].id },
                { tag_id: tags[1 + ((number - 1) % (tags.length - 1))].id },
              ],
            },
            tools: {
              create: [{ tool_id: tools[(number - 1) % tools.length].id }],
            },
          },
        });
        inserted++;
      }
    }
    return inserted;
  });
  const demoCount = await db.skill.count({
    where: { slug: { startsWith: "demo-" } },
  });
  const publicDemoCount = await db.skill.count({
    where: {
      slug: { startsWith: "demo-" },
      status: "published",
      owner: { status: "active" },
    },
  });
  const total = await db.skill.count();
  console.info(
    JSON.stringify({
      event: "demo_skills_seeded",
      created,
      demoSkills: demoCount,
      publicDemoSkills: publicDemoCount,
      totalBefore: before,
      totalAfter: total,
    }),
  );
} finally {
  await db.$disconnect();
}
