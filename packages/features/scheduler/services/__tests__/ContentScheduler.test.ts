import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishScheduledContent } from "../ContentScheduler";

vi.mock("@ecom/prisma", () => {
  return {
    prisma: {
      post: { updateMany: vi.fn() },
      page: { updateMany: vi.fn() },
    },
  };
});

vi.mock("@ecom/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("publishScheduledContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should publish posts and pages past scheduledAt", async () => {
    const { prisma } = await import("@ecom/prisma");
    (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
    (prisma.page.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const result = await publishScheduledContent();

    expect(result.publishedPosts).toBe(2);
    expect(result.publishedPages).toBe(1);
    expect(prisma.post.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "DRAFT",
          scheduledAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
  });

  it("should return zeros when nothing is scheduled", async () => {
    const { prisma } = await import("@ecom/prisma");
    (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.page.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const result = await publishScheduledContent();

    expect(result.publishedPosts).toBe(0);
    expect(result.publishedPages).toBe(0);
  });
});
