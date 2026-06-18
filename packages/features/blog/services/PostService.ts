import type { RevisionService } from "@ecom/features/revision/services/RevisionService";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";
import type { ContentStatus } from "@prisma/client";
import type { PostRepository } from "../repositories/PostRepository";
import type { SlugService } from "./SlugService";

const log = createLogger("PostService");

interface IPostServiceDeps {
  postRepo: PostRepository;
  slugService: SlugService;
  revisionService?: RevisionService;
}

export class PostService {
  private deps: IPostServiceDeps;
  constructor(deps: IPostServiceDeps) {
    this.deps = deps;
  }

  async listPosts(options: {
    status?: ContentStatus;
    authorId?: number;
    categoryId?: number;
    isFeatured?: boolean;
    search?: string;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
    sortBy?: "createdAt" | "title" | "publishedAt" | "views";
    sortOrder?: "asc" | "desc";
  }) {
    return this.deps.postRepo.findMany(options);
  }

  async getPost(id: number) {
    const post = await this.deps.postRepo.findByIdWithRelations(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    return post;
  }

  async getPostBySlug(slug: string) {
    const post = await this.deps.postRepo.findBySlug(slug);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    return post;
  }

  async createPost(data: {
    title: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    bannerImage?: string;
    isFeatured?: boolean;
    allowComments?: boolean;
    formatType?: string;
    status?: ContentStatus;
    authorId: number;
    categoryIds?: number[];
    tagIds?: number[];
  }) {
    const { slug: customSlug, ...rest } = data;

    const slugRecord = await this.deps.slugService.createSlug(
      0, // temporary — will update after create
      "Post",
      data.title,
      customSlug,
    );

    const post = await this.deps.postRepo.create({
      ...rest,
      slug: slugRecord.key,
      publishedAt: data.status === "PUBLISHED" ? new Date() : undefined,
    });

    // Update the slug registry with the real post ID
    await this.deps.slugService.updateSlug(post.id, "Post", data.title, slugRecord.key);

    return post;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles slug generation, category sync, tag sync, and event emission
  async updatePost(
    id: number,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      featuredImage?: string | null;
      bannerImage?: string | null;
      isFeatured?: boolean;
      allowComments?: boolean;
      formatType?: string | null;
      status?: ContentStatus;
      categoryIds?: number[];
      tagIds?: number[];
    },
  ) {
    const existing = await this.deps.postRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Post not found");
    if (existing.deletedAt) throw ErrorWithCode.Factory.BadRequest("Cannot update a deleted post");

    const { slug: customSlug, categoryIds, tagIds, ...postData } = data;

    // Handle status transition → set publishedAt
    if (data.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      Object.assign(postData, { publishedAt: new Date() });
    }

    // Auto-create revision snapshot before updating
    if (this.deps.revisionService) {
      try {
        await this.deps.revisionService.createRevision({
          referenceId: id,
          referenceType: "post",
          title: existing.title,
          content: existing.content ?? undefined,
          authorId: existing.authorId,
          note: "Auto-saved before update",
        });
      } catch (err) {
        log.warn("Failed to create revision", {
          postId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const updatedPost = await this.deps.postRepo.update(id, postData);

    // Sync slug if title or slug changed
    if (data.title || customSlug) {
      const slugRecord = await this.deps.slugService.updateSlug(
        id,
        "Post",
        data.title ?? existing.title,
        customSlug,
      );
      // Sync the denormalized slug on Post
      if (slugRecord.key !== updatedPost.slug) {
        await this.deps.postRepo.update(id, { slug: slugRecord.key });
      }
    }

    // Sync categories if provided
    if (categoryIds !== undefined) {
      await this.deps.postRepo.updateCategories(id, categoryIds);
    }

    // Sync tags if provided
    if (tagIds !== undefined) {
      await this.deps.postRepo.updateTags(id, tagIds);
    }

    return this.deps.postRepo.findByIdWithRelations(id);
  }

  async publishPost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    if (post.deletedAt) throw ErrorWithCode.Factory.BadRequest("Cannot publish a deleted post");
    if (post.status === "PUBLISHED")
      throw ErrorWithCode.Factory.BadRequest("Post is already published");

    return this.deps.postRepo.update(id, {
      status: "PUBLISHED",
      publishedAt: new Date(),
    });
  }

  async archivePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    return this.deps.postRepo.update(id, { status: "ARCHIVED" });
  }

  async recordView(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    return this.deps.postRepo.incrementViews(id);
  }

  async deletePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    return this.deps.postRepo.softDelete(id);
  }

  async restorePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    if (!post.deletedAt) throw ErrorWithCode.Factory.BadRequest("Post is not deleted");

    return this.deps.postRepo.restore(id);
  }

  async permanentlyDeletePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    await this.deps.slugService.deleteSlug(id, "Post");
    return this.deps.postRepo.hardDelete(id);
  }

  async clonePost(id: number, authorId: number) {
    const source = await this.deps.postRepo.findByIdWithRelations(id);
    if (!source) throw ErrorWithCode.Factory.NotFound("Post not found");

    const clonedTitle = `${source.title} (Copy)`;

    const slugRecord = await this.deps.slugService.createSlug(0, "Post", clonedTitle);

    const clone = await this.deps.postRepo.create({
      title: clonedTitle,
      slug: slugRecord.key,
      content: source.content ?? undefined,
      excerpt: source.excerpt ?? undefined,
      featuredImage: source.featuredImage ?? undefined,
      bannerImage: source.bannerImage ?? undefined,
      isFeatured: false,
      allowComments: source.allowComments,
      formatType: source.formatType ?? undefined,
      status: "DRAFT",
      authorId,
      categoryIds: source.categories?.map((c: { category: { id: number } }) => c.category.id),
      tagIds: source.tags?.map((t: { tag: { id: number } }) => t.tag.id),
    });

    await this.deps.slugService.updateSlug(clone.id, "Post", clonedTitle, slugRecord.key);

    log.info("Post cloned", { sourceId: id, cloneId: clone.id });
    return clone;
  }
}
