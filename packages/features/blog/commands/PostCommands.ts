import { OutboxStore } from "@ecom/features/events/OutboxStore";
import type { RevisionService } from "@ecom/features/revision/services/RevisionService";
import { type ContentStatus, runInTransaction } from "@ecom/prisma";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { lockManager } from "@flash-ship/ecom-lib/lock";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import type { PostRepository } from "../repositories/PostRepository";
import type { SlugService } from "../services/SlugService";

const log = createLogger("PostCommands");

export interface IPostCommandsDeps {
  postRepo: PostRepository;
  slugService: SlugService;
  revisionService?: RevisionService;
}

export class PostCommands {
  constructor(private deps: IPostCommandsDeps) {}

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
    externalSource?: string;
    sponsoredBy?: string;
    status?: ContentStatus;
    authorId: string;
    categoryIds?: number[];
    tagIds?: number[];
  }) {
    const post = await runInTransaction(async () => {
      const { slug: customSlug, ...rest } = data;

      const slugRecord = await this.deps.slugService.createSlug(
        0, // temporary — will update after create
        "Post",
        data.title,
        customSlug,
      );

      const createdPost = await this.deps.postRepo.create({
        ...rest,
        slug: slugRecord.key,
        publishedAt: data.status === "PUBLISHED" ? new Date() : undefined,
      });

      // Update the slug registry with the real post ID
      await this.deps.slugService.updateSlug(createdPost.id, "Post", data.title, slugRecord.key);

      // Sync categories if provided
      if (data.categoryIds !== undefined && data.categoryIds.length > 0) {
        await this.deps.postRepo.updateCategories(createdPost.id, data.categoryIds);
      }

      // Sync tags if provided
      if (data.tagIds !== undefined && data.tagIds.length > 0) {
        await this.deps.postRepo.updateTags(createdPost.id, data.tagIds);
      }

      // Save events to outbox within transaction
      await OutboxStore.publish("post.created", {
        postId: createdPost.id,
        authorId: data.authorId,
        title: createdPost.title,
      });

      if (createdPost.status === "PUBLISHED") {
        await OutboxStore.publish("post.published", {
          postId: createdPost.id,
          slug: createdPost.slug,
          authorId: data.authorId,
        });
      }

      return createdPost;
    });

    return post;
  }

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
      externalSource?: string | null;
      sponsoredBy?: string | null;
      status?: ContentStatus;
      categoryIds?: number[];
      tagIds?: number[];
      authorId?: string;
    },
  ) {
    // Acquire a distributed lock to prevent race conditions during concurrent updates
    return lockManager.runWithLock(`post:update:${id}`, 5000, async () => {
      const existing = await this.deps.postRepo.findById(id);
      if (!existing) throw ErrorWithCode.Factory.NotFound("Post not found");
      if (existing.deletedAt)
        throw ErrorWithCode.Factory.BadRequest("Cannot update a deleted post");

      const originalStatus = existing.status;
      const changedFields: string[] = [];
      if (data.title && data.title !== existing.title) changedFields.push("title");
      if (data.content && data.content !== existing.content) changedFields.push("content");

      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: performs post update, revisions, slug creation, and categorization sync inside a transaction context
      const finalPost = await runInTransaction(async () => {
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

        const reloadedPost = await this.deps.postRepo.findByIdWithRelations(id);
        if (!reloadedPost) {
          throw ErrorWithCode.Factory.NotFound("Post not found after update");
        }

        // Save events to outbox within transaction
        await OutboxStore.publish("post.updated", {
          postId: id,
          authorId: existing.authorId,
          changes: changedFields,
        });

        if (data.status && data.status !== originalStatus) {
          await OutboxStore.publish("post.statusChanged", {
            postId: id,
            from: originalStatus,
            to: data.status,
            authorId: existing.authorId,
          });

          if (data.status === "PUBLISHED") {
            await OutboxStore.publish("post.published", {
              postId: id,
              slug: reloadedPost.slug,
              authorId: existing.authorId,
            });
          } else if (originalStatus === "PUBLISHED") {
            await OutboxStore.publish("post.unpublished", {
              postId: id,
              authorId: existing.authorId,
            });
          }
        }

        return reloadedPost;
      });

      return finalPost;
    });
  }

  async publishPost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    if (post.deletedAt) throw ErrorWithCode.Factory.BadRequest("Cannot publish a deleted post");
    if (post.status === "PUBLISHED")
      throw ErrorWithCode.Factory.BadRequest("Post is already published");

    return runInTransaction(async () => {
      const updated = await this.deps.postRepo.update(id, {
        status: "PUBLISHED",
        publishedAt: new Date(),
      });

      await OutboxStore.publish("post.published", {
        postId: id,
        slug: post.slug,
        authorId: post.authorId,
      });

      return updated;
    });
  }

  async archivePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    return runInTransaction(async () => {
      const updated = await this.deps.postRepo.update(id, { status: "ARCHIVED" });

      await OutboxStore.publish("post.statusChanged", {
        postId: id,
        from: post.status,
        to: "ARCHIVED",
        authorId: post.authorId,
      });

      return updated;
    });
  }

  async recordView(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    return this.deps.postRepo.incrementViews(id);
  }

  async deletePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    return runInTransaction(async () => {
      const deleted = await this.deps.postRepo.softDelete(id);

      await OutboxStore.publish("post.deleted", {
        postId: id,
        authorId: post.authorId,
        permanent: false,
      });

      return deleted;
    });
  }

  async restorePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    if (!post.deletedAt) throw ErrorWithCode.Factory.BadRequest("Post is not deleted");

    return runInTransaction(async () => {
      const restored = await this.deps.postRepo.restore(id);

      await OutboxStore.publish("post.restored", {
        postId: id,
        authorId: post.authorId,
      });

      return restored;
    });
  }

  async permanentlyDeletePost(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");

    const result = await runInTransaction(async () => {
      await this.deps.slugService.deleteSlug(id, "Post");
      const hardDeleted = await this.deps.postRepo.hardDelete(id);

      await OutboxStore.publish("post.deleted", {
        postId: id,
        authorId: post.authorId,
        permanent: true,
      });

      return hardDeleted;
    });

    return result;
  }

  async clonePost(id: number, authorId: string) {
    const source = await this.deps.postRepo.findByIdWithRelations(id);
    if (!source) throw ErrorWithCode.Factory.NotFound("Post not found");

    const clonedTitle = `${source.title} (Copy)`;

    const clone = await runInTransaction(async () => {
      const slugRecord = await this.deps.slugService.createSlug(0, "Post", clonedTitle);

      const createdClone = await this.deps.postRepo.create({
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

      await this.deps.slugService.updateSlug(createdClone.id, "Post", clonedTitle, slugRecord.key);

      await OutboxStore.publish("post.created", {
        postId: createdClone.id,
        authorId: authorId,
        title: createdClone.title,
      });

      return createdClone;
    });

    log.info("Post cloned", { sourceId: id, cloneId: clone.id });

    return clone;
  }
}
