import { describe, expect, it, vi } from "vitest";
import { RelatedPostsService } from "../services/RelatedPostsService";

function createMockDeps() {
  return {
    findPostWithRelations: vi.fn(),
    findCandidates: vi.fn(),
  };
}

const mockPost = (id: number, categoryIds: number[], tagIds: number[]) => ({
  id,
  title: `Post ${id}`,
  slug: `post-${id}`,
  excerpt: null,
  featuredImage: null,
  publishedAt: new Date(),
  categoryIds,
  tagIds,
});

describe("RelatedPostsService", () => {
  it("should return empty array when source post not found", async () => {
    const deps = createMockDeps();
    deps.findPostWithRelations.mockResolvedValue(null);
    const service = new RelatedPostsService(deps);

    const results = await service.findRelated(999);
    expect(results).toEqual([]);
  });

  it("should score by shared categories (3 points each)", async () => {
    const deps = createMockDeps();
    deps.findPostWithRelations.mockResolvedValue({
      id: 1,
      categoryIds: [10, 20],
      tagIds: [],
      authorId: 1,
    });
    deps.findCandidates.mockResolvedValue([
      mockPost(2, [10, 20], []), // 2 shared cats = 6 points
      mockPost(3, [10], []), // 1 shared cat = 3 points
    ]);

    const service = new RelatedPostsService(deps);
    const results = await service.findRelated(1);

    expect(results[0].post.id).toBe(2);
    expect(results[0].score).toBe(6);
    expect(results[1].post.id).toBe(3);
    expect(results[1].score).toBe(3);
  });

  it("should score by shared tags (2 points each)", async () => {
    const deps = createMockDeps();
    deps.findPostWithRelations.mockResolvedValue({
      id: 1,
      categoryIds: [],
      tagIds: [100, 200, 300],
      authorId: 1,
    });
    deps.findCandidates.mockResolvedValue([
      mockPost(2, [], [100, 200, 300]), // 3 shared tags = 6 points
      mockPost(3, [], [100]), // 1 shared tag = 2 points
    ]);

    const service = new RelatedPostsService(deps);
    const results = await service.findRelated(1);

    expect(results[0].score).toBe(6);
    expect(results[1].score).toBe(2);
  });

  it("should combine category and tag scores", async () => {
    const deps = createMockDeps();
    deps.findPostWithRelations.mockResolvedValue({
      id: 1,
      categoryIds: [10],
      tagIds: [100],
      authorId: 1,
    });
    deps.findCandidates.mockResolvedValue([
      mockPost(2, [10], [100]), // 3 + 2 = 5 points
      mockPost(3, [10], []), // 3 points
    ]);

    const service = new RelatedPostsService(deps);
    const results = await service.findRelated(1);

    expect(results[0].score).toBe(5);
    expect(results[1].score).toBe(3);
  });

  it("should exclude posts with zero score", async () => {
    const deps = createMockDeps();
    deps.findPostWithRelations.mockResolvedValue({
      id: 1,
      categoryIds: [10],
      tagIds: [100],
      authorId: 1,
    });
    deps.findCandidates.mockResolvedValue([
      mockPost(2, [99], [999]), // No overlap = 0 points
    ]);

    const service = new RelatedPostsService(deps);
    const results = await service.findRelated(1);

    expect(results).toHaveLength(0);
  });

  it("should limit results", async () => {
    const deps = createMockDeps();
    deps.findPostWithRelations.mockResolvedValue({
      id: 1,
      categoryIds: [10],
      tagIds: [],
      authorId: 1,
    });
    deps.findCandidates.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => mockPost(i + 2, [10], [])),
    );

    const service = new RelatedPostsService(deps);
    const results = await service.findRelated(1, 3);

    expect(results).toHaveLength(3);
  });
});
