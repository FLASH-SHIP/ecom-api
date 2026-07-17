import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceTokenRepository } from "../../repositories/DeviceTokenRepository";
import type { NotificationRepository } from "../../repositories/NotificationRepository";
import type { NotificationSettingRepository } from "../../repositories/NotificationSettingRepository";
import { DeviceTokenService } from "../DeviceTokenService";
import { NotificationService } from "../NotificationService";
import { NotificationSettingService } from "../NotificationSettingService";
import { PushNotificationService } from "../PushNotificationService";

// Mock external modules
vi.mock("@ecom/emails", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@ecom/lib/redis", () => ({
  getRedisClient: vi.fn().mockReturnValue({
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
  }),
}));

describe("NotificationService", () => {
  let mockNotificationRepo: Record<string, unknown>;
  let mockDeviceTokenRepo: Record<string, unknown>;
  let mockNotificationSettingRepo: Record<string, unknown>;

  let deviceTokenService: DeviceTokenService;
  let notificationSettingService: NotificationSettingService;
  let pushNotificationService: PushNotificationService;
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNotificationRepo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 123, ...data })),
      findByOwner: vi.fn().mockResolvedValue({ items: [], nextCursor: undefined }),
      findByUser: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getUnreadCount: vi.fn().mockResolvedValue(0),
      markRead: vi.fn().mockResolvedValue({ count: 1 }),
      markAllRead: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue({ count: 1 }),
      updateTracking: vi.fn().mockResolvedValue({ count: 1 }),
    };

    mockDeviceTokenRepo = {
      upsertToken: vi.fn(),
      deleteToken: vi.fn(),
      findByOwner: vi.fn().mockResolvedValue([{ token: "fcm-token-123", platform: "ios" }]),
      deleteMany: vi.fn(),
    };

    mockNotificationSettingRepo = {
      findByOwner: vi.fn().mockResolvedValue([]),
      upsertSetting: vi.fn(),
    };

    deviceTokenService = new DeviceTokenService({
      deviceTokenRepo: mockDeviceTokenRepo as unknown as DeviceTokenRepository,
    });

    notificationSettingService = new NotificationSettingService({
      notificationSettingRepo:
        mockNotificationSettingRepo as unknown as NotificationSettingRepository,
    });

    pushNotificationService = new PushNotificationService();

    // Force initialized to bypass real FCM calls
    const rawPushService = pushNotificationService as unknown as {
      isInitialized: boolean;
      firebaseAdmin: unknown;
    };
    rawPushService.isInitialized = true;
    rawPushService.firebaseAdmin = {};

    // Mock sendPushNotification method
    pushNotificationService.sendPushNotification = vi.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      invalidTokens: [],
    });

    service = new NotificationService({
      notificationRepo: mockNotificationRepo as unknown as NotificationRepository,
      deviceTokenService,
      notificationSettingService,
      pushNotificationService,
    });
  });

  describe("notify", () => {
    it("should save in-app notification when allowed", async () => {
      const result = await service.notify({
        userId: "user-123",
        type: "order.created",
        titleKey: "Test Title",
        messageKey: "Test Message",
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(123);
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          type: "order.created",
          titleKey: "Test Title",
          messageKey: "Test Message",
        }),
      );
    });

    it("should send push notification via PushNotificationService", async () => {
      await service.notify({
        userId: "user-123",
        type: "order.created",
        titleKey: "Test Title",
        messageKey: "Test Message",
      });

      expect(pushNotificationService.sendPushNotification).toHaveBeenCalledWith(
        ["fcm-token-123"],
        expect.objectContaining({
          title: "Test Title",
          body: "Test Message",
        }),
      );
    });

    it("should mask PII when notification is marked sensitive", async () => {
      await service.notify({
        userId: "user-123",
        type: "order.created",
        titleKey: "Sensitive Title",
        messageKey: "Sensitive Message Details",
        isSensitive: true,
      });

      expect(pushNotificationService.sendPushNotification).toHaveBeenCalledWith(
        ["fcm-token-123"],
        expect.objectContaining({
          title: "Thông báo mới",
          body: "Bạn có thông báo bảo mật mới. Vui lòng mở ứng dụng để xem.",
        }),
      );
    });

    it("should silence push and email during Quiet Hours DND for marketing events", async () => {
      // Mock setting overrides with active DND
      (mockNotificationSettingRepo.findByOwner as vi.Mock).mockResolvedValue([
        {
          eventType: "promotion.new",
          channelInApp: true,
          channelPush: true,
          channelEmail: true,
          channelWebhook: false,
          dndConfig: { enabled: true, start: "00:00", end: "23:59" }, // Always DND
        },
      ]);

      await service.notify({
        customerId: "customer-123",
        type: "promotion.new",
        titleKey: "Sale Off",
        messageKey: "Buy now!",
        deliveryClass: "MARKETING",
        emailRecipient: "user@example.com",
      });

      // In-app is still saved
      expect(mockNotificationRepo.create).toHaveBeenCalled();
      // Push is silenced
      expect(pushNotificationService.sendPushNotification).not.toHaveBeenCalled();
    });

    it("should NOT silence push or email during Quiet Hours for TRANSACTIONAL events", async () => {
      (mockNotificationSettingRepo.findByOwner as vi.Mock).mockResolvedValue([
        {
          eventType: "order.status_updated",
          channelInApp: true,
          channelPush: true,
          channelEmail: true,
          channelWebhook: false,
          dndConfig: { enabled: true, start: "00:00", end: "23:59" }, // Always DND
        },
      ]);

      await service.notify({
        customerId: "customer-123",
        type: "order.status_updated",
        titleKey: "Order Status",
        messageKey: "Your order was shipped",
        deliveryClass: "TRANSACTIONAL",
        emailRecipient: "user@example.com",
      });

      // Transactional ignores DND
      expect(pushNotificationService.sendPushNotification).toHaveBeenCalled();
    });
  });
});
