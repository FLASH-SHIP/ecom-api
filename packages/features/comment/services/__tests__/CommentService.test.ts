import { describe, expect, it, vi } from "vitest";
import type { CommentRepository } from "../../repositories/CommentRepository";
import { CommentService } from "../CommentService";

function createMockRepo() {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    findThreaded: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
    countByStatus: vi.fn(),
  } as unknown as CommentRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("CommentService", () => {
  describe("createComment", () => {
    it("should create a comment with pending status", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.create.mockResolvedValue({
        id: 1,
        content: "Great post!",
        status: "pending",
        createdAt: new Date(),
      });

      const result = await service.createComment({
        content: "Great post!",
        authorName: "John",
        authorEmail: "john@example.com",
        postId: 1,
      });

      expect(result.status).toBe("pending");
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
    });

    it("should allow creating nested comments with parentId", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.create.mockResolvedValue({ id: 2, content: "Reply", status: "pending" });

      await service.createComment({
        content: "Reply",
        postId: 1,
        parentId: 1,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 1, status: "pending" }),
      );
    });
  });

  describe("approve", () => {
    it("should approve a pending comment", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "pending" });
      repo.updateStatus.mockResolvedValue({ id: 1, status: "approved" });

      const result = await service.approve(1);
      expect(result.status).toBe("approved");
    });

    it("should throw NotFound for non-existent comment", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.approve(999)).rejects.toThrow("Comment not found");
    });
  });

  describe("markSpam", () => {
    it("should mark a comment as spam", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "pending" });
      repo.updateStatus.mockResolvedValue({ id: 1, status: "spam" });

      const result = await service.markSpam(1);
      expect(result.status).toBe("spam");
    });
  });

  describe("trash", () => {
    it("should trash a comment", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "approved" });
      repo.updateStatus.mockResolvedValue({ id: 1, status: "trash" });

      const result = await service.trash(1);
      expect(result.status).toBe("trash");
    });
  });

  describe("deleteComment", () => {
    it("should permanently delete a comment", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "trash" });
      repo.remove.mockResolvedValue({ id: 1 });

      await service.deleteComment(1);
      expect(repo.remove).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when deleting non-existent comment", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.deleteComment(999)).rejects.toThrow("Comment not found");
    });
  });

  describe("getThreadedComments", () => {
    it("should return threaded comments for a post", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      const mockThreaded = [{ id: 1, content: "Root", replies: [{ id: 2, content: "Reply" }] }];
      repo.findThreaded.mockResolvedValue(mockThreaded);

      const result = await service.getThreadedComments(1);
      expect(result).toEqual(mockThreaded);
      expect(result[0].replies).toHaveLength(1);
    });
  });

  describe("getStatusCounts", () => {
    it("should return comment counts by status", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.countByStatus.mockResolvedValue({ pending: 5, approved: 20, spam: 2, trash: 1 });

      const result = await service.getStatusCounts();
      expect(result).toEqual({ pending: 5, approved: 20, spam: 2, trash: 1 });
    });
  });

  describe("getComment", () => {
    it("should return comment with replies", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      const mockComment = { id: 1, content: "Test", replies: [] };
      repo.findById.mockResolvedValue(mockComment);

      const result = await service.getComment(1);
      expect(result).toEqual(mockComment);
    });

    it("should throw NotFound for non-existent comment", async () => {
      const repo = createMockRepo();
      const service = new CommentService({ commentRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.getComment(999)).rejects.toThrow("Comment not found");
    });
  });
});
