import { describe, expect, it, vi } from "vitest";
import { BulkActionService } from "../BulkActionService";

function createMockPrisma() {
  return {
    post: { update: vi.fn() },
    postCategory: { createMany: vi.fn() },
    category: { update: vi.fn() },
    tag: { delete: vi.fn() },
    page: { update: vi.fn() },
    member: { update: vi.fn() },
  };
}

describe("BulkActionService", () => {
  describe("bulkDeletePosts", () => {
    it("should soft-delete all posts", async () => {
      const prisma = createMockPrisma();
      prisma.post.update.mockResolvedValue({ id: 1 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkDeletePosts([1, 2, 3]);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(prisma.post.update).toHaveBeenCalledTimes(3);
    });

    it("should report partial failures", async () => {
      const prisma = createMockPrisma();
      prisma.post.update
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new Error("Not found"))
        .mockResolvedValueOnce({ id: 3 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkDeletePosts([1, 2, 3]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0].id).toBe(2);
    });
  });

  describe("bulkStatusPosts", () => {
    it("should update status to PUBLISHED with publishedAt", async () => {
      const prisma = createMockPrisma();
      prisma.post.update.mockResolvedValue({ id: 1 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkStatusPosts([1, 2], "PUBLISHED");

      expect(result.success).toBe(2);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PUBLISHED", publishedAt: expect.any(Date) }),
        }),
      );
    });

    it("should update status to DRAFT without publishedAt", async () => {
      const prisma = createMockPrisma();
      prisma.post.update.mockResolvedValue({ id: 1 });

      const service = new BulkActionService(prisma as never);
      await service.bulkStatusPosts([1], "DRAFT");

      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "DRAFT" },
        }),
      );
    });
  });

  describe("bulkCategoryAssign", () => {
    it("should assign categories to posts", async () => {
      const prisma = createMockPrisma();
      prisma.postCategory.createMany.mockResolvedValue({ count: 2 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkCategoryAssign([1, 2], [10, 20]);

      expect(result.success).toBe(2);
    });
  });

  describe("bulkDeleteTags", () => {
    it("should hard-delete tags", async () => {
      const prisma = createMockPrisma();
      prisma.tag.delete.mockResolvedValue({ id: 1 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkDeleteTags([1, 2, 3]);

      expect(result.success).toBe(3);
      expect(prisma.tag.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe("bulkDeletePages", () => {
    it("should soft-delete pages", async () => {
      const prisma = createMockPrisma();
      prisma.page.update.mockResolvedValue({ id: 1 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkDeletePages([1, 2]);

      expect(result.success).toBe(2);
    });
  });

  describe("bulkStatusMembers", () => {
    it("should update member status", async () => {
      const prisma = createMockPrisma();
      prisma.member.update.mockResolvedValue({ id: 1 });

      const service = new BulkActionService(prisma as never);
      const result = await service.bulkStatusMembers([1, 2], "BANNED");

      expect(result.success).toBe(2);
      expect(prisma.member.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "BANNED" } }),
      );
    });
  });

  describe("empty input", () => {
    it("should handle empty arrays", async () => {
      const prisma = createMockPrisma();
      const service = new BulkActionService(prisma as never);

      const result = await service.bulkDeletePosts([]);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
