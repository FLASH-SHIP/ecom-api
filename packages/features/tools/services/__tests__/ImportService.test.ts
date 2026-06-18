import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../ImportService";

function createMockPrisma() {
  return {
    post: {
      create: vi.fn(),
    },
    category: {
      create: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
    page: {
      create: vi.fn(),
    },
    setting: {
      upsert: vi.fn(),
    },
  };
}

describe("ImportService", () => {
  describe("importPosts", () => {
    it("should import posts successfully", async () => {
      const prisma = createMockPrisma();
      prisma.post.create.mockResolvedValue({ id: 1 });

      const service = new ImportService(prisma as never);

      const result = await service.importPosts([
        { title: "Post 1", authorId: 1 },
        { title: "Post 2", authorId: 1 },
      ]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should report partial failures", async () => {
      const prisma = createMockPrisma();
      prisma.post.create
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new Error("Duplicate slug"))
        .mockResolvedValueOnce({ id: 3 });

      const service = new ImportService(prisma as never);

      const result = await service.importPosts([
        { title: "Post 1", authorId: 1 },
        { title: "Post 2", slug: "duplicate", authorId: 1 },
        { title: "Post 3", authorId: 1 },
      ]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].error).toContain("Duplicate slug");
    });

    it("should handle empty data", async () => {
      const prisma = createMockPrisma();
      const service = new ImportService(prisma as never);

      const result = await service.importPosts([]);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe("importCategories", () => {
    it("should import categories", async () => {
      const prisma = createMockPrisma();
      prisma.category.create.mockResolvedValue({ id: 1 });

      const service = new ImportService(prisma as never);

      const result = await service.importCategories([
        { name: "Category 1" },
        { name: "Category 2", parentId: 1 },
      ]);

      expect(result.success).toBe(2);
    });
  });

  describe("importTags", () => {
    it("should upsert tags", async () => {
      const prisma = createMockPrisma();
      prisma.tag.upsert.mockResolvedValue({ id: 1 });

      const service = new ImportService(prisma as never);

      const result = await service.importTags([
        { name: "TypeScript" },
        { name: "JavaScript", slug: "js" },
      ]);

      expect(result.success).toBe(2);
    });
  });

  describe("importPages", () => {
    it("should import pages", async () => {
      const prisma = createMockPrisma();
      prisma.page.create.mockResolvedValue({ id: 1 });

      const service = new ImportService(prisma as never);

      const result = await service.importPages([
        { title: "About Us", authorId: 1 },
        { title: "Contact", template: "contact", authorId: 1 },
      ]);

      expect(result.success).toBe(2);
    });
  });

  describe("importSettings", () => {
    it("should upsert settings", async () => {
      const prisma = createMockPrisma();
      prisma.setting.upsert.mockResolvedValue({ id: 1 });

      const service = new ImportService(prisma as never);

      const result = await service.importSettings([
        { key: "site_name", value: "My Blog" },
        { key: "site_description", value: "A great blog" },
      ]);

      expect(result.success).toBe(2);
    });
  });

  describe("error resilience", () => {
    it("should continue processing after a failure", async () => {
      const prisma = createMockPrisma();
      prisma.setting.upsert
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 3 });

      const service = new ImportService(prisma as never);

      const result = await service.importSettings([
        { key: "key1", value: "val1" },
        { key: "key2", value: "val2" },
        { key: "key3", value: "val3" },
      ]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0].index).toBe(0);
    });
  });
});
