import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentTemplateService } from "../ContentTemplateService";

const mockRepo = {
  findMany: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("ContentTemplateService", () => {
  let service: ContentTemplateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentTemplateService({ templateRepo: mockRepo as never });
  });

  it("should list templates", async () => {
    mockRepo.findMany.mockResolvedValue([]);
    const result = await service.list();
    expect(result).toEqual([]);
  });

  it("should reject duplicate slug", async () => {
    mockRepo.findBySlug.mockResolvedValue({ id: 1 });

    await expect(service.create({ name: "Test", slug: "test", type: "post" })).rejects.toThrow(
      /already exists/,
    );
  });

  it("should duplicate template", async () => {
    mockRepo.findById.mockResolvedValue({
      id: 1,
      name: "Blog Post",
      slug: "blog-post",
      type: "post",
      content: "Hello",
      structure: null,
      thumbnail: null,
      createdBy: null,
    });
    mockRepo.create.mockResolvedValue({ id: 2, name: "Blog Post (Copy)" });

    const result = await service.duplicate(1);
    expect(result.name).toBe("Blog Post (Copy)");
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Blog Post (Copy)" }),
    );
  });

  it("should throw when duplicating non-existent template", async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.duplicate(999)).rejects.toThrow(/not found/i);
  });
});
