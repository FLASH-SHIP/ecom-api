import { BaseTransformer } from "@flash-ship/ecom-lib";

export interface PostResponseDto {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featuredImage: string | null;
  bannerImage: string | null;
  isFeatured: boolean;
  allowComments: boolean;
  formatType: string | null;
  externalSource: string | null;
  sponsoredBy: string | null;
  views: number;
  status: string;
  authorId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  categories?: Array<{
    category: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
  tags?: Array<{
    tag: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
}

export interface PostInput {
  id: number;
  title?: string;
  slug?: string;
  content?: string | null;
  excerpt?: string | null;
  featuredImage?: string | null;
  bannerImage?: string | null;
  isFeatured?: boolean;
  allowComments?: boolean;
  formatType?: string | null;
  externalSource?: string | null;
  sponsoredBy?: string | null;
  views?: number;
  status?: string;
  authorId?: string;
  publishedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  author?: {
    id: string;
    name: string | null;
    avatarUrl?: string | null;
  } | null;
  categories?: Array<{
    category: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
  tags?: Array<{
    tag: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
}

export class PostTransformer extends BaseTransformer<PostInput, PostResponseDto> {
  transform(post: PostInput): PostResponseDto {
    return {
      id: post.id,
      title: post.title ?? "",
      slug: post.slug ?? "",
      content: post.content ?? null,
      excerpt: post.excerpt ?? null,
      featuredImage: post.featuredImage ?? null,
      bannerImage: post.bannerImage ?? null,
      isFeatured: !!post.isFeatured,
      allowComments: !!post.allowComments,
      formatType: post.formatType ?? null,
      externalSource: post.externalSource ?? null,
      sponsoredBy: post.sponsoredBy ?? null,
      views: post.views ?? 0,
      status: post.status ?? "DRAFT",
      authorId: post.authorId ?? "",
      publishedAt: this.formatDate(post.publishedAt),
      createdAt: this.formatDate(post.createdAt) ?? new Date().toISOString(),
      updatedAt: this.formatDate(post.updatedAt) ?? new Date().toISOString(),
      author: this.formatAuthor(post.author),
      categories: this.formatCategories(post.categories),
      tags: this.formatTags(post.tags),
    };
  }

  private formatDate(date?: Date | string | null): string | null {
    if (!date) return null;
    return date instanceof Date ? date.toISOString() : date;
  }

  private formatAuthor(author?: PostInput["author"]): PostResponseDto["author"] {
    if (!author) return null;
    return {
      id: author.id,
      name: author.name ?? null,
      avatarUrl: author.avatarUrl ?? null,
    };
  }

  private formatCategories(categories?: PostInput["categories"]): PostResponseDto["categories"] {
    if (!Array.isArray(categories)) return undefined;
    return categories.map((c) => ({
      category: {
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
      },
    }));
  }

  private formatTags(tags?: PostInput["tags"]): PostResponseDto["tags"] {
    if (!Array.isArray(tags)) return undefined;
    return tags.map((t) => ({
      tag: {
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug,
      },
    }));
  }
}
