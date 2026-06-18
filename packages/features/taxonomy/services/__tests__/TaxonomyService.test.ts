import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaxonomyService } from "../TaxonomyService";

const mockRepo = {
  findMany: vi.fn(),
  findById: vi.fn(),
  findBySlugAndType: vi.fn(),
  getTree: vi.fn(),
  getTypes: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("TaxonomyService", () => {
  let service: TaxonomyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TaxonomyService({ taxonomyRepo: mockRepo as never });
  });

  it("should list taxonomies", async () => {
    mockRepo.findMany.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100 });
    const result = await service.list({ type: "category" });
    expect(result.items).toEqual([]);
    expect(mockRepo.findMany).toHaveBeenCalledWith({ type: "category" });
  });

  it("should create taxonomy", async () => {
    mockRepo.findBySlugAndType.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 1, name: "Tech", slug: "tech", type: "category" });

    const result = await service.create({ name: "Tech", slug: "tech", type: "category" });
    expect(result.id).toBe(1);
  });

  it("should reject duplicate slug+type", async () => {
    mockRepo.findBySlugAndType.mockResolvedValue({ id: 1 });

    await expect(service.create({ name: "Tech", slug: "tech", type: "category" })).rejects.toThrow(
      /already exists/,
    );
  });

  it("should reject self-referencing parent", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, children: [] });

    await expect(service.update(1, { parentId: 1 })).rejects.toThrow(/own parent/);
  });

  it("should reject delete with children", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, children: [{ id: 2 }] });

    await expect(service.delete(1)).rejects.toThrow(/children/);
  });

  it("should delete taxonomy without children", async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, children: [] });
    mockRepo.delete.mockResolvedValue({ id: 1 });

    const result = await service.delete(1);
    expect(result.id).toBe(1);
  });
});
