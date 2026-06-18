import { describe, expect, it, vi } from "vitest";
import { MemberActivityService } from "../MemberActivityService";

function createMockDeps() {
  return {
    activityLogRepo: {
      create: vi.fn(),
      findByMember: vi.fn(),
      getStats: vi.fn(),
    },
  };
}

describe("MemberActivityService", () => {
  it("should log activity", async () => {
    const deps = createMockDeps();
    const service = new MemberActivityService(deps);
    deps.activityLogRepo.create.mockResolvedValue({
      id: 1,
      action: "LOGIN",
      createdAt: new Date(),
    });

    const result = await service.logActivity({
      memberId: 1,
      action: "LOGIN",
      ipAddress: "192.168.1.1",
    });

    expect(result.action).toBe("LOGIN");
    expect(deps.activityLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 1, action: "LOGIN" }),
    );
  });

  it("should get activity history with pagination", async () => {
    const deps = createMockDeps();
    const service = new MemberActivityService(deps);
    deps.activityLogRepo.findByMember.mockResolvedValue({
      items: [{ id: 1, action: "LOGIN" }],
      total: 1,
      page: 1,
      perPage: 20,
    });

    const result = await service.getActivityHistory(1, { page: 1 });
    expect(result.total).toBe(1);
    expect(deps.activityLogRepo.findByMember).toHaveBeenCalledWith(1, { page: 1 });
  });

  it("should get member stats", async () => {
    const deps = createMockDeps();
    const service = new MemberActivityService(deps);
    deps.activityLogRepo.getStats.mockResolvedValue({
      total: 42,
      lastActivity: { action: "UPDATE_PROFILE", createdAt: new Date() },
    });

    const stats = await service.getMemberStats(1);
    expect(stats.total).toBe(42);
    expect(stats.lastActivity?.action).toBe("UPDATE_PROFILE");
  });
});
