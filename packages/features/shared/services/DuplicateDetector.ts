import { prisma } from "@ecom/prisma";

/**
 * Checks if a post/page title or slug already exists.
 * Returns warnings (not errors) to allow user to proceed if desired.
 */
export async function checkDuplicates(data: {
  title: string;
  slug?: string;
  type: "post" | "page";
  excludeId?: number;
}): Promise<{ titleDuplicates: string[]; slugDuplicate: boolean }> {
  const titleDuplicates: string[] = [];
  let slugDuplicate = false;

  const model = data.type === "post" ? prisma.post : prisma.page;

  // Check title similarity
  const titleMatches = await (model as typeof prisma.post).findMany({
    where: {
      title: { equals: data.title, mode: "insensitive" },
      ...(data.excludeId && { id: { not: data.excludeId } }),
      deletedAt: null,
    },
    select: { id: true, title: true, slug: true },
    take: 5,
  });

  for (const match of titleMatches) {
    titleDuplicates.push(`"${match.title}" (${match.slug})`);
  }

  // Check slug uniqueness
  if (data.slug) {
    const slugMatch = await (model as typeof prisma.post).findFirst({
      where: {
        slug: data.slug,
        ...(data.excludeId && { id: { not: data.excludeId } }),
        deletedAt: null,
      },
      select: { id: true },
    });
    slugDuplicate = !!slugMatch;
  }

  return { titleDuplicates, slugDuplicate };
}
