import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "../NotificationService";

function createMockDeps() {
  return {
    notificationRepo: {
      create: vi.fn(),
      findByUser: vi.fn(),
      getUnreadCount: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe("NotificationService", () => {
  it("should notify a single user", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.create.mockResolvedValue({
      id: 1,
      type: "comment",
      title: "New comment",
    });

    const result = await service.notify({
      userId: 1,
      type: "comment",
      title: "New comment",
      message: "John left a comment",
    });
    expect(result.type).toBe("comment");
    expect(deps.notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, type: "comment" }),
    );
  });

  it("should notify multiple users", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.create.mockResolvedValue({ id: 1 });

    const results = await service.notifyUsers([1, 2, 3], {
      type: "system",
      title: "Update",
      message: "System updated",
    });
    expect(results).toHaveLength(3);
    expect(deps.notificationRepo.create).toHaveBeenCalledTimes(3);
  });

  it("should list notifications with pagination", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.findByUser.mockResolvedValue({
      items: [{ id: 1 }],
      total: 1,
      page: 1,
      perPage: 20,
    });

    const result = await service.listNotifications(1, { page: 1 });
    expect(result.total).toBe(1);
    expect(deps.notificationRepo.findByUser).toHaveBeenCalledWith(1, { page: 1 });
  });

  it("should get unread count", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.getUnreadCount.mockResolvedValue(5);

    const count = await service.getUnreadCount(1);
    expect(count).toBe(5);
  });

  it("should mark single notification as read", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.markRead.mockResolvedValue({ count: 1 });

    await service.markRead(10, 1);
    expect(deps.notificationRepo.markRead).toHaveBeenCalledWith(10, 1);
  });

  it("should mark all notifications as read", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.markAllRead.mockResolvedValue({ count: 5 });

    await service.markAllRead(1);
    expect(deps.notificationRepo.markAllRead).toHaveBeenCalledWith(1);
  });

  it("should delete notification", async () => {
    const deps = createMockDeps();
    const service = new NotificationService(deps);
    deps.notificationRepo.delete.mockResolvedValue({ count: 1 });

    await service.deleteNotification(10, 1);
    expect(deps.notificationRepo.delete).toHaveBeenCalledWith(10, 1);
  });
});
