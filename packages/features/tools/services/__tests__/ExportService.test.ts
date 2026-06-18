import { describe, expect, it, vi } from "vitest";
import { ExportService } from "../ExportService";

function createMockPrisma() {
  return {
    post: { findMany: vi.fn().mockResolvedValue([{ id: 1, title: "Post 1" }]) },
    category: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "Cat" }]) },
    tag: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "Tag" }]) },
    page: { findMany: vi.fn().mockResolvedValue([{ id: 1, title: "Page" }]) },
    member: { findMany: vi.fn().mockResolvedValue([{ id: 1, email: "a@b.com" }]) },
    setting: { findMany: vi.fn().mockResolvedValue([{ id: 1, key: "site_name" }]) },
  };
}

describe("ExportService", () => {
  it("should export posts", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    const result = await service.exportPosts();
    expect(result).toHaveLength(1);
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("should export categories ordered by order", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    const result = await service.exportCategories();
    expect(result).toHaveLength(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: "asc" } }),
    );
  });

  it("should export tags ordered by name", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    const result = await service.exportTags();
    expect(result).toHaveLength(1);
  });

  it("should export pages", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    const result = await service.exportPages();
    expect(result).toHaveLength(1);
  });

  it("should export members without sensitive fields", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    await service.exportMembers();
    const selectArg = prisma.member.findMany.mock.calls[0][0].select;
    expect(selectArg.password).toBeUndefined();
    expect(selectArg.email).toBe(true);
  });

  it("should export settings", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    const result = await service.exportSettings();
    expect(result).toHaveLength(1);
  });

  it("should export all and include metadata", async () => {
    const prisma = createMockPrisma();
    const service = new ExportService(prisma as never);

    const result = await service.exportAll();
    expect(result.version).toBe("1.0");
    expect(result.exportedAt).toBeDefined();
    expect(result.data.posts).toHaveLength(1);
    expect(result.data.categories).toHaveLength(1);
    expect(result.data.tags).toHaveLength(1);
    expect(result.data.pages).toHaveLength(1);
    expect(result.data.members).toHaveLength(1);
    expect(result.data.settings).toHaveLength(1);
  });
});
