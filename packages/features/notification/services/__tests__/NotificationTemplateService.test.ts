import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationTemplateService } from "../NotificationTemplateService";

const mockTemplateRepo = {
  list: vi.fn(),
  findByType: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockInvalidate = vi.fn();
vi.mock("@flash-ship/ecom-lib/redis", () => ({
  RedisCache: class MockRedisCache {
    invalidate = mockInvalidate;
  },
}));

describe("NotificationTemplateService", () => {
  const service = new NotificationTemplateService({
    templateRepo: mockTemplateRepo as any,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list templates", async () => {
    mockTemplateRepo.list.mockResolvedValue([{ id: 1, type: "test" }]);
    const result = await service.listTemplates();
    expect(result).toEqual([{ id: 1, type: "test" }]);
    expect(mockTemplateRepo.list).toHaveBeenCalled();
  });

  it("should get template by type", async () => {
    mockTemplateRepo.findByType.mockResolvedValue({ id: 1, type: "test" });
    const result = await service.getTemplateByType("test");
    expect(result).toEqual({ id: 1, type: "test" });
    expect(mockTemplateRepo.findByType).toHaveBeenCalledWith("test");
  });

  it("should create template", async () => {
    const input = {
      type: "test",
      titleTemplate: { en: "Hello" },
      messageTemplate: { en: "World" },
    };
    mockTemplateRepo.create.mockResolvedValue({ id: 1, ...input });
    const result = await service.createTemplate(input);
    expect(result).toEqual({ id: 1, ...input });
    expect(mockTemplateRepo.create).toHaveBeenCalledWith(input);
  });

  it("should update template and invalidate Redis cache", async () => {
    const updateInput = {
      titleTemplate: { en: "Hello updated" },
    };
    mockTemplateRepo.update.mockResolvedValue({ id: 1, type: "test-type", ...updateInput });

    const result = await service.updateTemplate(1, updateInput);

    expect(result).toEqual({ id: 1, type: "test-type", ...updateInput });
    expect(mockTemplateRepo.update).toHaveBeenCalledWith(1, updateInput);
    expect(mockInvalidate).toHaveBeenCalledWith("test-type");
  });

  it("should delete template and invalidate Redis cache", async () => {
    mockTemplateRepo.delete.mockResolvedValue({ id: 1, type: "test-type" });

    const result = await service.deleteTemplate(1);

    expect(result).toEqual({ id: 1, type: "test-type" });
    expect(mockTemplateRepo.delete).toHaveBeenCalledWith(1);
    expect(mockInvalidate).toHaveBeenCalledWith("test-type");
  });
});
