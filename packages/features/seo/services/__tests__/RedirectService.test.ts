import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectService } from "../RedirectService";

const mockRepo = {
  findByFromPath: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  incrementHitCount: vi.fn(),
};

describe("RedirectService", () => {
  let service: RedirectService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RedirectService({ redirectRepo: mockRepo as never });
  });

  it("should resolve a redirect and increment hit count", async () => {
    mockRepo.findByFromPath.mockResolvedValue({
      id: 1,
      fromPath: "/old",
      toPath: "/new",
      statusCode: 301,
      isActive: true,
    });
    mockRepo.incrementHitCount.mockResolvedValue({});

    const result = await service.resolve("/old");
    expect(result).toEqual({ toPath: "/new", statusCode: 301 });
  });

  it("should return null for inactive redirect", async () => {
    mockRepo.findByFromPath.mockResolvedValue({
      id: 1,
      isActive: false,
    });

    const result = await service.resolve("/old");
    expect(result).toBeNull();
  });

  it("should reject self-redirect", async () => {
    await expect(service.create({ fromPath: "/same", toPath: "/same" })).rejects.toThrow(
      /cannot be the same/,
    );
  });

  it("should reject duplicate fromPath", async () => {
    mockRepo.findByFromPath.mockResolvedValue({ id: 1 });

    await expect(service.create({ fromPath: "/old", toPath: "/new" })).rejects.toThrow(
      /already exists/,
    );
  });

  it("should create redirect when valid", async () => {
    mockRepo.findByFromPath.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 1, fromPath: "/old", toPath: "/new" });

    const result = await service.create({ fromPath: "/old", toPath: "/new" });
    expect(result.id).toBe(1);
  });
});
