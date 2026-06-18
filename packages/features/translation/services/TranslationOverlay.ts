import { prisma } from "@ecom/prisma";

/**
 * Translation overlay utilities for public API responses.
 *
 * These functions take an entity (post, category, etc.) and a locale code,
 * then merge translated fields over the original entity — matching Botble's
 * `getTranslatedAttribute()` pattern but applied at the API response level.
 */

type PostLike = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  [key: string]: unknown;
};

type CategoryLike = {
  id: number;
  name: string;
  description?: string | null;
  [key: string]: unknown;
};

type TagLike = {
  id: number;
  name: string;
  [key: string]: unknown;
};

/**
 * Overlays translated post fields onto a post object.
 * Returns the original post with translated title, slug, excerpt, content if translation exists.
 */
export async function overlayPostTranslation<T extends PostLike>(
  post: T,
  locale: string | null,
): Promise<T & { _translatedFrom?: string }> {
  if (!locale) return post;

  const translation = await prisma.postTranslation.findUnique({
    where: { postId_langCode: { postId: post.id, langCode: locale } },
    select: { title: true, slug: true, excerpt: true, content: true },
  });

  if (!translation) return post;

  return {
    ...post,
    title: translation.title || post.title,
    slug: translation.slug || post.slug,
    excerpt: translation.excerpt ?? post.excerpt,
    content: translation.content ?? post.content,
    _translatedFrom: locale,
  };
}

/**
 * Overlays translated fields onto multiple posts in a batch.
 * Uses a single DB query for performance.
 */
export async function overlayPostTranslations<T extends PostLike>(
  posts: T[],
  locale: string | null,
): Promise<(T & { _translatedFrom?: string })[]> {
  if (!locale || posts.length === 0) return posts;

  const postIds = posts.map((p) => p.id);
  const translations = await prisma.postTranslation.findMany({
    where: { postId: { in: postIds }, langCode: locale },
    select: { postId: true, title: true, slug: true, excerpt: true, content: true },
  });

  const translationMap = new Map(translations.map((t) => [t.postId, t]));

  return posts.map((post) => {
    const t = translationMap.get(post.id);
    if (!t) return post;
    return {
      ...post,
      title: t.title || post.title,
      slug: t.slug || post.slug,
      excerpt: t.excerpt ?? post.excerpt,
      content: t.content ?? post.content,
      _translatedFrom: locale,
    };
  });
}

/**
 * Overlays translated category fields.
 */
export async function overlayCategoryTranslation<T extends CategoryLike>(
  category: T,
  locale: string | null,
): Promise<T & { _translatedFrom?: string }> {
  if (!locale) return category;

  const translation = await prisma.categoryTranslation.findUnique({
    where: { categoryId_langCode: { categoryId: category.id, langCode: locale } },
    select: { name: true, description: true },
  });

  if (!translation) return category;

  return {
    ...category,
    name: translation.name || category.name,
    description: translation.description ?? category.description,
    _translatedFrom: locale,
  };
}

/**
 * Overlays translated fields onto a category tree (with nested children) in a batch.
 * Collects all IDs across tree depth, fetches translations in one query, then overlays recursively.
 */
export async function overlayCategoryTranslations<T extends CategoryLike>(
  categories: T[],
  locale: string | null,
): Promise<T[]> {
  if (!locale || categories.length === 0) return categories;

  const allIds = collectCategoryIds(categories);
  const translations = await prisma.categoryTranslation.findMany({
    where: { categoryId: { in: allIds }, langCode: locale },
    select: { categoryId: true, name: true, description: true },
  });

  const translationMap = new Map(translations.map((t) => [t.categoryId, t]));

  return applyCategoryOverlay(categories, translationMap, locale) as T[];
}

function collectCategoryIds(categories: { id: number; [key: string]: unknown }[]): number[] {
  const ids: number[] = [];
  for (const cat of categories) {
    ids.push(cat.id);
    const children = cat.children;
    if (Array.isArray(children) && children.length > 0) {
      ids.push(...collectCategoryIds(children as { id: number; [key: string]: unknown }[]));
    }
  }
  return ids;
}

function applyCategoryOverlay(
  categories: CategoryLike[],
  translationMap: Map<number, { name: string; description: string | null }>,
  locale: string,
): CategoryLike[] {
  return categories.map((cat) => {
    const t = translationMap.get(cat.id);
    const overlaid = t
      ? {
          ...cat,
          name: t.name || cat.name,
          description: t.description ?? cat.description,
          _translatedFrom: locale,
        }
      : { ...cat };

    const children = (overlaid as Record<string, unknown>).children;
    if (Array.isArray(children) && children.length > 0) {
      (overlaid as Record<string, unknown>).children = applyCategoryOverlay(
        children as CategoryLike[],
        translationMap,
        locale,
      );
    }

    return overlaid;
  });
}

/**
 * Overlays translated tag fields in a batch.
 */
export async function overlayTagTranslations<T extends TagLike>(
  tags: T[],
  locale: string | null,
): Promise<(T & { _translatedFrom?: string })[]> {
  if (!locale || tags.length === 0) return tags;

  const tagIds = tags.map((t) => t.id);
  const translations = await prisma.tagTranslation.findMany({
    where: { tagId: { in: tagIds }, langCode: locale },
    select: { tagId: true, name: true },
  });

  const translationMap = new Map(translations.map((t) => [t.tagId, t]));

  return tags.map((tag) => {
    const t = translationMap.get(tag.id);
    if (!t) return tag;
    return {
      ...tag,
      name: t.name || tag.name,
      _translatedFrom: locale,
    };
  });
}

type PageLike = {
  id: number;
  title: string;
  slug: string;
  content?: string | null;
  [key: string]: unknown;
};

/**
 * Overlays translated page fields onto a single page.
 * Falls back to default language content when translation doesn't exist.
 */
export async function overlayPageTranslation<T extends PageLike>(
  page: T,
  locale: string | null,
): Promise<T & { _translatedFrom?: string }> {
  if (!locale) return page;

  const translation = await prisma.pageTranslation.findUnique({
    where: { pageId_langCode: { pageId: page.id, langCode: locale } },
    select: { title: true, slug: true, content: true },
  });

  if (!translation) return page;

  return {
    ...page,
    title: translation.title || page.title,
    slug: translation.slug || page.slug,
    content: translation.content ?? page.content,
    _translatedFrom: locale,
  };
}

/**
 * Overlays translated page fields in batch (single DB query).
 * Falls back to default language content when translation doesn't exist.
 */
export async function overlayPageTranslations<T extends PageLike>(
  pages: T[],
  locale: string | null,
): Promise<(T & { _translatedFrom?: string })[]> {
  if (!locale || pages.length === 0) return pages;

  const pageIds = pages.map((p) => p.id);
  const translations = await prisma.pageTranslation.findMany({
    where: { pageId: { in: pageIds }, langCode: locale },
    select: { pageId: true, title: true, slug: true, content: true },
  });

  const translationMap = new Map(translations.map((t) => [t.pageId, t]));

  return pages.map((page) => {
    const t = translationMap.get(page.id);
    if (!t) return page;
    return {
      ...page,
      title: t.title || page.title,
      slug: t.slug || page.slug,
      content: t.content ?? page.content,
      _translatedFrom: locale,
    };
  });
}

/**
 * Overlays translated menu item fields in batch.
 * Falls back to default language text when translation doesn't exist.
 */
export async function overlayMenuItemTranslations<
  T extends { id: number; title: string; [key: string]: unknown },
>(items: T[], locale: string | null): Promise<(T & { _translatedFrom?: string })[]> {
  if (!locale || items.length === 0) return items;

  const itemIds = items.map((i) => i.id);
  const translations = await prisma.menuItemTranslation.findMany({
    where: { menuItemId: { in: itemIds }, langCode: locale },
    select: { menuItemId: true, label: true },
  });

  const translationMap = new Map(translations.map((t) => [t.menuItemId, t]));

  return items.map((item) => {
    const t = translationMap.get(item.id);
    if (!t) return item;
    return {
      ...item,
      title: t.label || item.title,
      _translatedFrom: locale,
    };
  });
}

/**
 * Find a post by its translated slug.
 * Resolution order: SlugTranslation → original Slug.
 */
export async function findPostByTranslatedSlug(
  slug: string,
  locale: string | null,
): Promise<{ postId: number; resolvedLocale: string } | null> {
  if (locale) {
    const slugTranslation = await prisma.slugTranslation.findFirst({
      where: {
        key: slug,
        langCode: locale,
        slug: { referenceType: "Post" },
      },
      select: {
        slug: { select: { referenceId: true } },
      },
    });

    if (slugTranslation) {
      return { postId: slugTranslation.slug.referenceId, resolvedLocale: locale };
    }
  }

  // Fallback: try the default slug
  const defaultSlug = await prisma.slug.findFirst({
    where: { key: slug, referenceType: "Post" },
    select: { referenceId: true },
  });

  if (defaultSlug) {
    return { postId: defaultSlug.referenceId, resolvedLocale: "default" };
  }

  return null;
}
