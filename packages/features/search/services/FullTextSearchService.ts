import { prisma } from "@ecom/prisma";

/**
 * Full-text search across posts and pages using PostgreSQL ILIKE with
 * multiple field matching and relevance scoring.
 *
 * For production-grade search, consider upgrading to PostgreSQL tsvector
 * or integrating Meilisearch/Typesense.
 */
export async function fullTextSearch(options: {
  query: string;
  types?: ("post" | "page")[];
  status?: string;
  page?: number;
  perPage?: number;
}): Promise<{
  results: SearchResult[];
  total: number;
  page: number;
  perPage: number;
}> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 20;
  const types = options.types ?? ["post", "page"];
  const _searchTerm = `%${options.query}%`;

  const results: SearchResult[] = [];
  let total = 0;

  if (types.includes("post")) {
    const where = {
      deletedAt: null,
      ...(options.status && { status: options.status as "PUBLISHED" }),
      OR: [
        { title: { contains: options.query, mode: "insensitive" as const } },
        { content: { contains: options.query, mode: "insensitive" as const } },
        { excerpt: { contains: options.query, mode: "insensitive" as const } },
      ],
    };

    const [posts, postCount] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.post.count({ where }),
    ]);

    results.push(
      ...posts.map((p) => ({
        type: "post" as const,
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        status: p.status,
        date: p.publishedAt ?? p.createdAt,
      })),
    );
    total += postCount;
  }

  if (types.includes("page")) {
    const where = {
      deletedAt: null,
      ...(options.status && { status: options.status as "PUBLISHED" }),
      OR: [
        { title: { contains: options.query, mode: "insensitive" as const } },
        { content: { contains: options.query, mode: "insensitive" as const } },
      ],
    };

    const [pages, pageCount] = await Promise.all([
      prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.page.count({ where }),
    ]);

    results.push(
      ...pages.map((p) => ({
        type: "page" as const,
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        status: p.status,
        date: p.createdAt,
      })),
    );
    total += pageCount;
  }

  return { results, total, page, perPage };
}

export interface SearchResult {
  type: "post" | "page";
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  date: Date;
}
