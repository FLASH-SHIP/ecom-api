import { describe, expect, it, vi } from "vitest";
import type { PostRepository } from "../../repositories/PostRepository";
import { PostService } from "../PostService";
import type { SlugService } from "../SlugService";

function createMockPostRepo() {
  return {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    findBySlug: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    hardDelete: vi.fn(),
    incrementViews: vi.fn(),
    updateCategories: vi.fn(),
    updateTags: vi.fn(),
  } as unknown as PostRepository & Record<string, ReturnType<typeof vi.fn>>;
}

function createMockSlugService() {
  return {
    createSlug: vi.fn(),
    updateSlug: vi.fn(),
    deleteSlug: vi.fn(),
  } as unknown as SlugService & Record<string, ReturnType<typeof vi.fn>>;
}

describe("PostService", () => {
  describe("getPost", () => {
    it("should return post when found", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      const mockPost = { id: 1, title: "Hello World", slug: "hello-world" };
      postRepo.findByIdWithRelations.mockResolvedValue(mockPost);

      const result = await service.getPost(1);
      expect(result).toEqual(mockPost);
    });

    it("should throw NotFound when post does not exist", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.getPost(999)).rejects.toThrow("Post not found");
    });
  });

  describe("getPostBySlug", () => {
    it("should throw NotFound when slug does not exist", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findBySlug.mockResolvedValue(null);

      await expect(service.getPostBySlug("nonexistent")).rejects.toThrow("Post not found");
    });
  });

  describe("publishPost", () => {
    it("should publish a draft post", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, status: "DRAFT", deletedAt: null });
      postRepo.update.mockResolvedValue({ id: 1, status: "PUBLISHED" });

      const result = await service.publishPost(1);
      expect(result).toEqual({ id: 1, status: "PUBLISHED" });
      expect(postRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "PUBLISHED" }),
      );
    });

    it("should throw when publishing already published post", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, status: "PUBLISHED", deletedAt: null });

      await expect(service.publishPost(1)).rejects.toThrow("Post is already published");
    });

    it("should throw when publishing a deleted post", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, status: "DRAFT", deletedAt: new Date() });

      await expect(service.publishPost(1)).rejects.toThrow("Cannot publish a deleted post");
    });
  });

  describe("deletePost", () => {
    it("should soft-delete a post", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, title: "Test" });
      postRepo.softDelete.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await service.deletePost(1);
      expect(postRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when post does not exist", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue(null);

      await expect(service.deletePost(999)).rejects.toThrow("Post not found");
    });
  });

  describe("restorePost", () => {
    it("should restore a soft-deleted post", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, deletedAt: new Date() });
      postRepo.restore.mockResolvedValue({ id: 1, deletedAt: null });

      await service.restorePost(1);
      expect(postRepo.restore).toHaveBeenCalledWith(1);
    });

    it("should throw when post is not deleted", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, deletedAt: null });

      await expect(service.restorePost(1)).rejects.toThrow("Post is not deleted");
    });
  });

  describe("updatePost", () => {
    it("should throw when updating a deleted post", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await expect(service.updatePost(1, { title: "New" })).rejects.toThrow(
        "Cannot update a deleted post",
      );
    });
  });

  describe("permanentlyDeletePost", () => {
    it("should hard-delete post and its slug", async () => {
      const postRepo = createMockPostRepo();
      const slugService = createMockSlugService();
      const service = new PostService({ postRepo, slugService });

      postRepo.findById.mockResolvedValue({ id: 1 });
      postRepo.hardDelete.mockResolvedValue({ id: 1 });
      slugService.deleteSlug.mockResolvedValue(undefined);

      await service.permanentlyDeletePost(1);
      expect(slugService.deleteSlug).toHaveBeenCalledWith(1, "Post");
      expect(postRepo.hardDelete).toHaveBeenCalledWith(1);
    });
  });
});
