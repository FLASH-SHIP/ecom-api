import { createLogger } from "@ecom/lib/logger";
import { prisma } from "@ecom/prisma";

const log = createLogger("ImportExport");

export interface ExportData {
  version: string;
  exportedAt: string;
  posts: ExportPost[];
  pages: ExportPage[];
  categories: ExportCategory[];
  tags: ExportTag[];
  redirects: ExportRedirect[];
}

interface ExportPost {
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  status: string;
  featuredImage: string | null;
  isFeatured: boolean;
  publishedAt: Date | null;
  categories: string[];
  tags: string[];
}

interface ExportPage {
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  status: string;
  template: string | null;
  order: number;
}

interface ExportCategory {
  name: string;
  slug: string;
  description: string | null;
  parentSlug: string | null;
}

interface ExportTag {
  name: string;
  slug: string;
}

interface ExportRedirect {
  fromPath: string;
  toPath: string;
  statusCode: number;
}

/**
 * Exports all CMS content to a portable JSON format.
 */
export async function exportContent(): Promise<ExportData> {
  const [posts, pages, categories, tags, redirects] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null },
      select: {
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        status: true,
        featuredImage: true,
        isFeatured: true,
        publishedAt: true,
        categories: {
          select: { category: { select: { slug: true } } },
        },
        tags: {
          select: { tag: { select: { slug: true } } },
        },
      },
    }),
    prisma.page.findMany({
      where: { deletedAt: null },
      select: {
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        status: true,
        template: true,
        order: true,
      },
    }),
    prisma.category.findMany({
      select: {
        name: true,
        slug: true,
        description: true,
        parent: { select: { slug: true } },
      },
    }),
    prisma.tag.findMany({
      select: {
        name: true,
        slug: true,
      },
    }),
    prisma.redirect.findMany({
      select: {
        fromPath: true,
        toPath: true,
        statusCode: true,
      },
    }),
  ]);

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    posts: posts.map((p) => ({
      ...p,
      categories: p.categories.map((c) => c.category.slug),
      tags: p.tags.map((t) => t.tag.slug),
    })),
    pages,
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      parentSlug: c.parent?.slug ?? null,
    })),
    tags,
    redirects,
  };
}

/**
 * Imports content from a JSON export.
 * Uses upsert to avoid duplicates — existing slugs are skipped for posts/pages.
 */
export async function importContent(data: ExportData): Promise<{
  categories: number;
  tags: number;
  posts: number;
  pages: number;
  redirects: number;
}> {
  let categoryCount = 0;
  let tagCount = 0;
  let postCount = 0;
  let pageCount = 0;
  let redirectCount = 0;

  // 1. Import categories (root first, then children)
  const rootCategories = data.categories.filter((c) => !c.parentSlug);
  const childCategories = data.categories.filter((c) => c.parentSlug);

  for (const cat of rootCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, description: cat.description },
      update: {},
    });
    categoryCount++;
  }

  for (const cat of childCategories) {
    const parent = await prisma.category.findUnique({
      where: { slug: cat.parentSlug ?? "" },
      select: { id: true },
    });
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parentId: parent?.id,
      },
      update: {},
    });
    categoryCount++;
  }

  // 2. Import tags
  for (const tag of data.tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      create: { name: tag.name, slug: tag.slug },
      update: {},
    });
    tagCount++;
  }

  // 3. Import pages
  for (const page of data.pages) {
    const existing = await prisma.page.findUnique({
      where: { slug: page.slug },
      select: { id: true },
    });
    if (!existing) {
      await prisma.page.create({
        data: {
          title: page.title,
          slug: page.slug,
          content: page.content,
          excerpt: page.excerpt,
          status: page.status as "DRAFT" | "PUBLISHED",
          template: page.template,
          order: page.order,
          author: { connect: { id: 1 } },
        },
      });
      pageCount++;
    }
  }

  // 4. Import posts
  for (const post of data.posts) {
    const existing = await prisma.post.findUnique({
      where: { slug: post.slug },
      select: { id: true },
    });
    if (!existing) {
      await prisma.post.create({
        data: {
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          status: post.status as "DRAFT" | "PUBLISHED",
          featuredImage: post.featuredImage,
          isFeatured: post.isFeatured,
          publishedAt: post.publishedAt,
          author: { connect: { id: 1 } },
        },
      });
      postCount++;
    }
  }

  // 5. Import redirects
  for (const redirect of data.redirects) {
    const existing = await prisma.redirect.findUnique({
      where: { fromPath: redirect.fromPath },
      select: { id: true },
    });
    if (!existing) {
      await prisma.redirect.create({ data: redirect });
      redirectCount++;
    }
  }

  log.info("Import completed", {
    categories: categoryCount,
    tags: tagCount,
    posts: postCount,
    pages: pageCount,
    redirects: redirectCount,
  });

  return {
    categories: categoryCount,
    tags: tagCount,
    posts: postCount,
    pages: pageCount,
    redirects: redirectCount,
  };
}
