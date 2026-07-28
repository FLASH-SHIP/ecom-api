import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduledNotificationService } from "../ScheduledNotificationService";

const mockScheduledRepo = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findPendingBefore: vi.fn(),
  list: vi.fn(),
};

const mockNotificationService = {
  notify: vi.fn(),
};

const mockUserRepo = {
  getAllIdsAndEmails: vi.fn(),
};

const mockCustomerRepo = {
  getAllIdsAndEmails: vi.fn(),
};

describe("ScheduledNotificationService", () => {
  const service = new ScheduledNotificationService({
    scheduledRepo: mockScheduledRepo as any,
    notificationService: mockNotificationService as any,
    userRepo: mockUserRepo as any,
    customerRepo: mockCustomerRepo as any,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create scheduled notification if scheduledAt is in the future", async () => {
      const input = {
        targetType: "ALL_CUSTOMERS",
        title: "Test Title",
        message: "Test Message",
        scheduledAt: new Date(Date.now() + 100000),
      };
      mockScheduledRepo.create.mockResolvedValue({ id: 1, ...input });

      const result = await service.create(input);

      expect(result.id).toBe(1);
      expect(mockScheduledRepo.create).toHaveBeenCalledWith(input);
    });

    it("should throw error if scheduledAt is in the past", async () => {
      const input = {
        targetType: "ALL_CUSTOMERS",
        title: "Test Title",
        message: "Test Message",
        scheduledAt: new Date(Date.now() - 100000),
      };

      await expect(service.create(input)).rejects.toThrow(ErrorWithCode);
      expect(mockScheduledRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete pending scheduled notification", async () => {
      mockScheduledRepo.findById.mockResolvedValue({ id: 1, status: "PENDING" });
      mockScheduledRepo.delete.mockResolvedValue({ id: 1 });

      const result = await service.delete(1);

      expect(result.id).toBe(1);
      expect(mockScheduledRepo.delete).toHaveBeenCalledWith(1);
    });

    it("should throw error if notification not found", async () => {
      mockScheduledRepo.findById.mockResolvedValue(null);

      await expect(service.delete(1)).rejects.toThrow("Scheduled notification not found");
    });

    it("should throw error if status is not PENDING", async () => {
      mockScheduledRepo.findById.mockResolvedValue({ id: 1, status: "SENT" });

      await expect(service.delete(1)).rejects.toThrow(
        "Can only delete pending scheduled notifications",
      );
    });
  });

  describe("list", () => {
    it("should delegate to scheduledRepo.list", async () => {
      mockScheduledRepo.list.mockResolvedValue({ items: [], total: 0 });
      const result = await service.list({ page: 1, perPage: 10 });
      expect(result).toEqual({ items: [], total: 0 });
      expect(mockScheduledRepo.list).toHaveBeenCalledWith({ page: 1, perPage: 10 });
    });
  });

  describe("dispatchDueNotifications", () => {
    it("should skip if no due notifications found", async () => {
      mockScheduledRepo.findPendingBefore.mockResolvedValue([]);
      await service.dispatchDueNotifications();
      expect(mockScheduledRepo.update).not.toHaveBeenCalled();
    });

    it("should resolve recipients and dispatch notifications", async () => {
      const dueItem = {
        id: 123,
        title: "Hello World",
        message: "A test message",
        link: "/test",
        targetType: "ALL_CUSTOMERS",
        targetIds: null,
      };

      mockScheduledRepo.findPendingBefore.mockResolvedValue([dueItem]);
      mockCustomerRepo.getAllIdsAndEmails.mockResolvedValue([
        { id: "cust-1", email: "cust1@example.com" },
        { id: "cust-2", email: "cust2@example.com" },
      ]);
      mockNotificationService.notify.mockResolvedValue({ id: 1 });

      await service.dispatchDueNotifications();

      expect(mockScheduledRepo.update).toHaveBeenCalledWith(123, { status: "PROCESSING" });
      expect(mockNotificationService.notify).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.notify).toHaveBeenCalledWith({
        customerId: "cust-1",
        userId: undefined,
        type: "manual.broadcast",
        titleKey: "Hello World",
        messageKey: "A test message",
        link: "/test",
        emailRecipient: "cust1@example.com",
        deliveryClass: "MARKETING",
      });
      expect(mockScheduledRepo.update).toHaveBeenCalledWith(123, { status: "SENT" });
    });
  });
});
