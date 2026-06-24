import type { Post, Prisma } from "../generated/prisma/client";
import { prisma } from "../index";
import { UserFactory } from "./UserFactory";

export class PostFactory {
  private overrides: Partial<Prisma.PostUncheckedCreateInput> = {};

  static new(): PostFactory {
    return new PostFactory();
  }

  published(): this {
    this.overrides.status = "PUBLISHED";
    this.overrides.publishedAt = new Date();
    return this;
  }

  draft(): this {
    this.overrides.status = "DRAFT";
    this.overrides.publishedAt = null;
    return this;
  }

  byAuthor(authorId: number): this {
    this.overrides.authorId = authorId;
    return this;
  }

  withTitle(title: string): this {
    this.overrides.title = title;
    if (!this.overrides.slug) {
      this.overrides.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }
    return this;
  }

  build(
    overrides: Partial<Prisma.PostUncheckedCreateInput> = {},
  ): Prisma.PostUncheckedCreateInput & { title: string } {
    return PostFactory.build({ ...this.overrides, ...overrides });
  }

  async create(overrides: Partial<Prisma.PostUncheckedCreateInput> = {}): Promise<Post> {
    const finalOverrides = { ...this.overrides, ...overrides };
    let authorId = finalOverrides.authorId;
    if (!authorId) {
      const author = await UserFactory.create();
      authorId = author.id;
    }
    const data = PostFactory.build({ ...finalOverrides, authorId });
    return prisma.post.create({
      data: data as Prisma.PostUncheckedCreateInput,
    });
  }

  static build(
    overrides: Partial<Prisma.PostUncheckedCreateInput> = {},
  ): Prisma.PostUncheckedCreateInput & { title: string } {
    const randomId = Math.random().toString(36).substring(7);
    return {
      title: overrides.title ?? `Test Post Title ${randomId}`,
      slug: overrides.slug ?? `test-post-slug-${randomId}`,
      status: overrides.status ?? "DRAFT",
      content: overrides.content ?? "Lorem ipsum dolor sit amet.",
      excerpt: overrides.excerpt ?? "Excerpt description.",
      authorId: overrides.authorId ?? 1, // Default fallback author ID
      ...overrides,
    };
  }

  static async create(overrides: Partial<Prisma.PostUncheckedCreateInput> = {}): Promise<Post> {
    let authorId = overrides.authorId;
    if (!authorId) {
      const author = await UserFactory.create();
      authorId = author.id;
    }
    const data = PostFactory.build({ authorId, ...overrides });
    return prisma.post.create({
      data: data as Prisma.PostUncheckedCreateInput,
    });
  }
}
