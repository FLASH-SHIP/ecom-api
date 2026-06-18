/**
 * Custom Fields default seed — Botble-compatible.
 *
 * Groups:
 *  1. "Post Additional Information" — appears on all Posts
 *  2. "Page Custom Fields"          — appears on all Pages
 *
 * Safety:
 *  - FieldGroup: `findFirst + create` — skips if already exists (admin may have edited it)
 *  - FieldItem: `upsert` — creates if missing; updates only display metadata
 *    (title, order, instructions, options) — NEVER type or slug to avoid breaking saved values
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import type { Seeder } from "./seeder.interface";

// ── Types ────────────────────────────────────────────────────────────────────

type RuleCondition = { name: string; type: "==" | "!="; value: string };
type RuleGroup = RuleCondition[];

interface FieldItemSeed {
  slug: string;
  title: string;
  type: string;
  order: number;
  instructions?: string;
  options?: Record<string, unknown>;
}

// ── Seeder ───────────────────────────────────────────────────────────────────

export const CustomFieldsSeeder: Seeder = {
  name: "Custom Fields (Botble defaults)",

  async run(prisma: PrismaClient) {
    let created = 0;
    let skipped = 0;

    for (const group of DEFAULT_FIELD_GROUPS) {
      const result = await ensureFieldGroup(prisma, group);
      if (result === "created") created++;
      else skipped++;
    }

    console.log(`    → ${created} groups created, ${skipped} already existed (skipped)`);
  },
};

// ── Default field group definitions ─────────────────────────────────────────

const DEFAULT_FIELD_GROUPS: Array<{
  title: string;
  order: number;
  rules: RuleGroup[];
  items: FieldItemSeed[];
}> = [
  {
    title: "Post Additional Information",
    order: 0,
    rules: [[{ name: "model_name", type: "==", value: "post" }]],
    items: [
      {
        slug: "post_options",
        title: "Post Options",
        type: "checkbox",
        order: 0,
        instructions: "Select post display options",
        options: {
          selectChoices:
            "featured:Featured post\nsticky:Sticky post\nshow_author:Show author\nallow_comments:Allow comments\nshow_date:Show publish date",
        },
      },
      {
        slug: "reading_time",
        title: "Reading Time",
        type: "number",
        order: 1,
        instructions: "Estimated reading time in minutes",
        options: { placeholderText: "5", defaultValue: "5", min: 1, max: 60 },
      },
      {
        slug: "external_source",
        title: "External Source",
        type: "text",
        order: 2,
        instructions: "Link to external source or reference",
        options: { placeholderText: "https://example.com/article" },
      },
      {
        slug: "post_type",
        title: "Post Type",
        type: "select",
        order: 3,
        instructions: "Select the type of post",
        options: {
          selectChoices: "article:Article\nnews:News\ntutorial:Tutorial\nreview:Review",
          defaultValue: "article",
        },
      },
      {
        slug: "custom_excerpt",
        title: "Custom Excerpt",
        type: "textarea",
        order: 4,
        instructions: "Custom excerpt for social media sharing",
        options: { placeholderText: "Enter a brief summary...", rows: 3 },
      },
      {
        slug: "sponsored_by",
        title: "Sponsored By",
        type: "text",
        order: 5,
        instructions: "Sponsor name (if applicable)",
        options: { placeholderText: "Company name" },
      },
    ],
  },
  {
    title: "Page Custom Fields",
    order: 1,
    rules: [[{ name: "model_name", type: "==", value: "page" }]],
    items: [
      {
        slug: "hero_banner",
        title: "Hero Banner",
        type: "image",
        order: 0,
        instructions: "Upload a hero banner image for this page",
        options: { allow_thumb: true },
      },
      {
        slug: "page_subtitle",
        title: "Page Subtitle",
        type: "text",
        order: 1,
        instructions: "Add a subtitle or tagline for this page",
        options: { placeholderText: "Enter page subtitle" },
      },
      {
        slug: "cta_button",
        title: "Call to Action",
        type: "text",
        order: 2,
        instructions: "Call to action button text",
        options: { placeholderText: "Learn More" },
      },
      {
        slug: "cta_link",
        title: "CTA Link",
        type: "text",
        order: 3,
        instructions: "URL for the call to action button",
        options: { placeholderText: "https://example.com/contact" },
      },
      {
        slug: "page_layout",
        title: "Page Layout",
        type: "radio",
        order: 4,
        instructions: "Select the page layout",
        options: {
          selectChoices:
            "default:Default Layout\nsidebar-left:Left Sidebar\nsidebar-right:Right Sidebar\nfull-width:Full Width",
          defaultValue: "default",
        },
      },
      {
        slug: "page_settings",
        title: "Page Settings",
        type: "checkbox",
        order: 5,
        instructions: "Select page display options",
        options: {
          selectChoices:
            "hide_title:Hide page title\nhide_breadcrumb:Hide breadcrumb\nhide_sidebar:Hide sidebar\nhide_footer:Hide footer",
        },
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureFieldGroup(
  prisma: PrismaClient,
  def: (typeof DEFAULT_FIELD_GROUPS)[number],
): Promise<"created" | "skipped"> {
  const existing = await prisma.fieldGroup.findFirst({
    where: { title: def.title },
    select: { id: true },
  });

  const groupId = existing
    ? existing.id
    : (
        await prisma.fieldGroup.create({
          data: { title: def.title, order: def.order, status: "published", rules: def.rules },
          select: { id: true },
        })
      ).id;

  await ensureFieldItems(prisma, groupId, def.items);

  return existing ? "skipped" : "created";
}

async function ensureFieldItems(prisma: PrismaClient, groupId: number, items: FieldItemSeed[]) {
  for (const item of items) {
    await prisma.fieldItem.upsert({
      where: { groupId_slug: { groupId, slug: item.slug } },
      update: {
        title: item.title,
        order: item.order,
        instructions: item.instructions ?? null,
        options: item.options ?? Prisma.JsonNull,
        // ⚠️  NOT updating: type, slug — breaks saved CustomFieldValues
      },
      create: {
        groupId,
        slug: item.slug,
        title: item.title,
        type: item.type,
        order: item.order,
        instructions: item.instructions ?? null,
        options: item.options ?? Prisma.JsonNull,
        parentId: null,
      },
    });
  }
}
