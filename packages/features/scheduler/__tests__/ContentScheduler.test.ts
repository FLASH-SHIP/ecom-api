import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentScheduler } from "../ContentScheduler";

function createMockPrisma() {
  return {
    post: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe("ContentScheduler", () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let scheduler: ContentScheduler;

  beforeEach(() => {
    prisma = createMockPrisma();
    scheduler = new ContentScheduler({ prisma });
  });

  describe("publishScheduledPosts", () => {
    it("should return 0 when no posts are scheduled", async () => {
      const count = await scheduler.publishScheduledPosts();
      expect(count).toBe(0);
    });

    it("should publish scheduled posts", async () => {
      prisma.post.findMany.mockResolvedValue([
        { id: 1, title: "Post 1" },
        { id: 2, title: "Post 2" },
      ]);
      prisma.post.updateMany.mockResolvedValue({ count: 2 });

      const count = await scheduler.publishScheduledPosts();
      expect(count).toBe(2);
      expect(prisma.post.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [1, 2] } },
          data: expect.objectContaining({
            status: "PUBLISHED",
            scheduledAt: null,
          }),
        }),
      );
    });
  });

  describe("archiveExpiredPosts", () => {
    it("should return 0 when no posts are expired", async () => {
      const count = await scheduler.archiveExpiredPosts();
      expect(count).toBe(0);
    });

    it("should archive expired posts", async () => {
      prisma.post.findMany.mockResolvedValue([{ id: 3, title: "Expired Post" }]);
      prisma.post.updateMany.mockResolvedValue({ count: 1 });

      const count = await scheduler.archiveExpiredPosts();
      expect(count).toBe(1);
      expect(prisma.post.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "ARCHIVED" },
        }),
      );
    });
  });

  describe("tick", () => {
    it("should run both publish and archive", async () => {
      const result = await scheduler.tick();
      expect(result).toEqual({ published: 0, archived: 0 });
    });
  });
});
