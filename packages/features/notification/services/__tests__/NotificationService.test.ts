import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import type { UserRepository } from "@ecom/features/rbac/repositories/UserRepository";
import { prisma } from "@ecom/prisma";
import { sendEmail } from "@flash-ship/ecom-emails";
import type { Setting } from "@prisma/client";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceTokenRepository } from "../../repositories/DeviceTokenRepository";
import type { NotificationRepository } from "../../repositories/NotificationRepository";
import type { NotificationSettingRepository } from "../../repositories/NotificationSettingRepository";
import type { NotificationTemplateRepository } from "../../repositories/NotificationTemplateRepository";
import { DeviceTokenService } from "../DeviceTokenService";
import { NotificationService } from "../NotificationService";
import { NotificationSettingService } from "../NotificationSettingService";
import { PushNotificationService } from "../PushNotificationService";

// Mock external modules
vi.mock("@flash-ship/ecom-emails", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flash-ship/ecom-emails")>();
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue(true),
  };
});

const mockPipeline = {
  set: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockRedis = {
  set: vi.fn().mockResolvedValue("OK"),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  pipeline: vi.fn(() => mockPipeline),
};

vi.mock("@flash-ship/ecom-lib/redis", () => ({
  getRedisClient: vi.fn(() => mockRedis),
  RedisCache: class MockRedisCache {
    private store = new Map();
    async get(key: string) {
      return this.store.get(key);
    }
    async set(key: string, val: unknown) {
      this.store.set(key, val);
    }
    async invalidate(key: string) {
      this.store.delete(key);
    }
  },
}));

const mockEmailBlacklist = {
  findUnique: vi.fn().mockResolvedValue(null),
  findMany: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
  upsert: vi.fn().mockResolvedValue({ id: 1, email: "test@example.com", reason: "bounce" }),
  deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  update: vi.fn().mockResolvedValue({ id: 1, email: "test@example.com", reason: "manual" }),
};

vi.mock("@ecom/prisma", () => ({
  prisma: {
    $transaction: vi.fn().mockImplementation((args) => Promise.all(args)),
    emailBlacklist: {
      // biome-ignore lint/suspicious/noExplicitAny: Mock args typing
      findUnique: (args: any) => mockEmailBlacklist.findUnique(args),
      // biome-ignore lint/suspicious/noExplicitAny: Mock args typing
      findMany: (args: any) => mockEmailBlacklist.findMany(args),
      // biome-ignore lint/suspicious/noExplicitAny: Mock args typing
      count: (args: any) => mockEmailBlacklist.count(args),
      // biome-ignore lint/suspicious/noExplicitAny: Mock args typing
      upsert: (args: any) => mockEmailBlacklist.upsert(args),
      // biome-ignore lint/suspicious/noExplicitAny: Mock args typing
      deleteMany: (args: any) => mockEmailBlacklist.deleteMany(args),
      // biome-ignore lint/suspicious/noExplicitAny: Mock args typing
      update: (args: any) => mockEmailBlacklist.update(args),
    },
    setting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

const mockWebhookDispatch = vi.fn().mockResolvedValue(undefined);
vi.mock("@ecom/features/di/containers/WebhookService", () => ({
  getWebhookService: vi.fn(() => ({
    dispatch: mockWebhookDispatch,
  })),
}));

const mockGet = vi.fn().mockResolvedValue(null);
const mockGetBoolean = vi.fn().mockResolvedValue(true);
const mockGetAll = vi.fn().mockResolvedValue({});
vi.mock("@ecom/features/di/containers/SettingService", () => ({
  getSettingService: vi.fn(() => ({
    get: mockGet,
    getBoolean: mockGetBoolean,
    getAll: mockGetAll,
  })),
}));

describe("NotificationService", () => {
  let mockNotificationRepo: Record<string, unknown>;
  let mockDeviceTokenRepo: Record<string, unknown>;
  let mockNotificationSettingRepo: {
    findByOwner: Mock;
    upsertSetting: Mock;
  };
  let mockTemplateRepo: {
    findByType: Mock;
    findById: Mock;
  };
  let mockUserRepo: {
    findById: Mock;
  };
  let mockCustomerRepo: {
    findById: Mock;
  };

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

    mockTemplateRepo = {
      findByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    };

    mockUserRepo = {
      findById: vi.fn().mockResolvedValue({ id: "user-123", locale: "vi" }),
    };

    mockCustomerRepo = {
      findById: vi.fn().mockResolvedValue({ id: "customer-123", metadata: { locale: "vi" } }),
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
      templateRepo: mockTemplateRepo as unknown as NotificationTemplateRepository,
      userRepo: mockUserRepo as unknown as UserRepository,
      customerRepo: mockCustomerRepo as unknown as CustomerRepository,
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

    it("should silence push but allow email during Quiet Hours DND for marketing events", async () => {
      // Mock setting overrides with active DND
      mockNotificationSettingRepo.findByOwner.mockResolvedValue([
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
      // Email is NOT silenced
      expect(sendEmail).toHaveBeenCalled();
    });

    it("should NOT silence push or email during Quiet Hours for TRANSACTIONAL events", async () => {
      mockNotificationSettingRepo.findByOwner.mockResolvedValue([
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

    it("should dispatch webhook when allowed by preferences", async () => {
      mockNotificationSettingRepo.findByOwner.mockResolvedValue([
        {
          eventType: "order.created",
          channelInApp: true,
          channelPush: false,
          channelEmail: false,
          channelWebhook: true,
        },
      ]);

      await service.notify({
        customerId: "customer-123",
        type: "order.created",
        titleKey: "Test Webhook Title",
        messageKey: "Test Webhook Message",
      });

      expect(mockWebhookDispatch).toHaveBeenCalledWith(
        "order.created",
        expect.objectContaining({
          type: "order.created",
          titleKey: "Test Webhook Title",
          messageKey: "Test Webhook Message",
        }),
        expect.objectContaining({
          ownerId: "customer-123",
          ownerType: "Customer",
        }),
      );
    });
  });

  describe("template compiler and caching", () => {
    it("should load template, compile variables with nested paths, and override channels", async () => {
      mockTemplateRepo.findByType.mockResolvedValue({
        id: 1,
        type: "order.created",
        titleTemplate: {
          en: "New Order {{order.code}}",
          vi: "Đơn hàng mới {{order.code}}",
        },
        messageTemplate: {
          en: "Hi {{customer.name}}, order {{order.code}} is created.",
          vi: "Chào {{customer.name}}, đơn {{order.code}} đã được tạo.",
        },
        channelInApp: true,
        channelPush: false, // disabled in template
        channelEmail: true,
      });

      mockUserRepo.findById.mockResolvedValue({
        id: "user-123",
        locale: "en",
      });

      const result = await service.notify({
        userId: "user-123",
        type: "order.created",
        titleKey: "Default Title",
        messageKey: "Default Message",
        variables: {
          customer: { name: "David" },
          order: { code: "ORD-001" },
        },
      });

      expect(result).toBeDefined();
      expect(result?.titleKey).toBe("New Order ORD-001");
      expect(result?.messageKey).toBe("Hi David, order ORD-001 is created.");

      // Push was silenced because channelPush is false in template
      expect(pushNotificationService.sendPushNotification).not.toHaveBeenCalled();
    });

    it("should fallback to raw keys if template is missing", async () => {
      mockTemplateRepo.findByType.mockResolvedValue(null);

      const result = await service.notify({
        userId: "user-123",
        type: "unknown.type",
        titleKey: "Fallback Title",
        messageKey: "Fallback Message",
      });

      expect(result).toBeDefined();
      expect(result?.titleKey).toBe("Fallback Title");
      expect(result?.messageKey).toBe("Fallback Message");
    });

    it("should gracefully handle missing variables with empty strings", async () => {
      mockTemplateRepo.findByType.mockResolvedValue({
        id: 2,
        type: "order.created",
        titleTemplate: {
          en: "New Order {{order.code}}",
          vi: "Đơn hàng mới {{order.code}}",
        },
        messageTemplate: {
          en: "Hi {{customer.name}}, your code is {{code}}.",
          vi: "Chào {{customer.name}}, mã của bạn là {{code}}.",
        },
        channelInApp: true,
        channelPush: true,
        channelEmail: true,
      });

      const result = await service.notify({
        userId: "user-123",
        type: "order.created",
        titleKey: "Default Title",
        messageKey: "Default Message",
        variables: {
          // variables are completely missing/empty
        },
      });

      expect(result?.titleKey).toBe("Đơn hàng mới ");
      expect(result?.messageKey).toBe("Chào , mã của bạn là .");
    });

    it("should compile safe HTML using triple curly braces and escape standard double curly braces", async () => {
      const result = await service.previewTemplate({
        customEmailBody: "Unescaped: {{{richHtml}}}, Escaped: {{richHtml}}",
        variables: {
          richHtml: "<div>Safe</div><script>alert(1)</script>",
        },
      });

      expect(result.html).toContain(
        "Unescaped: <div>Safe</div>, Escaped: &lt;div&gt;Safe&lt;/div&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
      );
    });

    it("should support previewTemplate with variables and locale", async () => {
      mockTemplateRepo.findById.mockResolvedValue({
        id: 999,
        type: "preview.test",
        emailSubjectTemplate: { en: "Preview Subject {{code}}" },
        emailBodyTemplate: { en: "Hello {{{name}}}. View details below." },
      });

      const result = await service.previewTemplate({
        templateId: 999,
        variables: {
          code: "XYZ-123",
          name: "<strong>David</strong>",
        },
        locale: "en",
      });

      expect(result.subject).toBe("Preview Subject XYZ-123");
      expect(result.html).toContain("Hello <strong>David</strong>. View details below.");
      expect(result.text).toContain("Hello David . View details below.");
    });
  });

  describe("email blacklist management", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should check blacklist using cache and database", async () => {
      // 1. Cache hit (returns true)
      mockRedis.get.mockResolvedValueOnce("bounce");
      let isBlacklisted = await service.isEmailBlacklisted("bounce@example.com");
      expect(isBlacklisted).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith("blacklist:email:bounce@example.com");

      // 2. Cache hit (returns false)
      mockRedis.get.mockResolvedValueOnce("none");
      isBlacklisted = await service.isEmailBlacklisted("clean@example.com");
      expect(isBlacklisted).toBe(false);

      // 3. Cache miss, DB hit (true)
      mockRedis.get.mockResolvedValueOnce(null);
      mockEmailBlacklist.findUnique.mockResolvedValueOnce({
        reason: "bounce",
      });
      isBlacklisted = await service.isEmailBlacklisted("bounce@example.com");
      expect(isBlacklisted).toBe(true);
      expect(mockEmailBlacklist.findUnique).toHaveBeenCalledWith({
        where: { email: "bounce@example.com" },
        select: { reason: true },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        "blacklist:email:bounce@example.com",
        "bounce",
        "EX",
        604800,
      );

      // 4. Cache miss, DB miss (false)
      mockRedis.get.mockResolvedValueOnce(null);
      mockEmailBlacklist.findUnique.mockResolvedValueOnce(null);
      isBlacklisted = await service.isEmailBlacklisted("clean@example.com");
      expect(isBlacklisted).toBe(false);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "blacklist:email:clean@example.com",
        "none",
        "EX",
        604800,
      );
    });

    it("should handle smart blacklist filtering based on reason and deliveryClass", async () => {
      // 1. Complaint (unsubscribe) + TRANSACTIONAL -> should ALLOW (returns false)
      mockRedis.get.mockResolvedValueOnce("complaint");
      let isBlacklisted = await service.isEmailBlacklisted(
        "complaint@example.com",
        "TRANSACTIONAL",
      );
      expect(isBlacklisted).toBe(false);

      // 2. Complaint (unsubscribe) + MARKETING -> should BLOCK (returns true)
      mockRedis.get.mockResolvedValueOnce("complaint");
      isBlacklisted = await service.isEmailBlacklisted("complaint@example.com", "MARKETING");
      expect(isBlacklisted).toBe(true);

      // 3. Bounce + TRANSACTIONAL -> should BLOCK (returns true)
      mockRedis.get.mockResolvedValueOnce("bounce");
      isBlacklisted = await service.isEmailBlacklisted("bounce@example.com", "TRANSACTIONAL");
      expect(isBlacklisted).toBe(true);

      // 4. Manual + TRANSACTIONAL -> should BLOCK (returns true)
      mockRedis.get.mockResolvedValueOnce("manual");
      isBlacklisted = await service.isEmailBlacklisted("manual@example.com", "TRANSACTIONAL");
      expect(isBlacklisted).toBe(true);
    });

    it("should skip sending email if recipient is blacklisted", async () => {
      mockRedis.get.mockResolvedValueOnce("1"); // blacklisted

      mockTemplateRepo.findByType.mockResolvedValue({
        type: "order.created",
        titleTemplate: { en: "Subject" },
        messageTemplate: { en: "Body" },
        emailSubjectTemplate: { en: "Subject" },
        emailBodyTemplate: { en: "Body" },
        variables: {},
        channelInApp: true,
        channelPush: true,
        channelEmail: true,
      });

      // biome-ignore lint/suspicious/noExplicitAny: Spy on private method
      const handleEmailDispatchSpy = vi.spyOn(service as any, "handleEmailDispatch");

      await service.notify({
        type: "order.created",
        titleKey: "Title",
        messageKey: "Message",
        emailRecipient: "bounce@example.com",
      });

      expect(handleEmailDispatchSpy).toHaveBeenCalled();
      const calls = handleEmailDispatchSpy.mock.calls[0];
      const emailAllowedArg = calls[2];
      expect(emailAllowedArg).toBe(false); // Should be falsy because it is blacklisted
    });

    it("should list blacklist entries with pagination", async () => {
      mockEmailBlacklist.findMany.mockResolvedValueOnce([
        { id: 1, email: "bounce@example.com", reason: "bounce" },
      ]);
      mockEmailBlacklist.count.mockResolvedValueOnce(1);

      const result = await service.listBlacklist({ page: 1, perPage: 10, search: "bounce" });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockEmailBlacklist.findMany).toHaveBeenCalledWith({
        where: { email: { contains: "bounce", mode: "insensitive" } },
        orderBy: { id: "desc" },
        take: 10,
        skip: 0,
      });
    });

    it("should add email to blacklist and set cache", async () => {
      mockEmailBlacklist.upsert.mockResolvedValueOnce({
        id: 1,
        email: "new@example.com",
        reason: "bounce",
      });

      await service.addToBlacklist("new@example.com", "bounce");
      expect(mockEmailBlacklist.upsert).toHaveBeenCalledWith({
        where: { email: "new@example.com" },
        create: { email: "new@example.com", reason: "bounce" },
        update: { reason: "bounce" },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        "blacklist:email:new@example.com",
        "1",
        "EX",
        604800,
      );
    });

    it("should remove email from blacklist individually and in bulk", async () => {
      // Individual
      await service.removeFromBlacklist("bounce@example.com");
      expect(mockEmailBlacklist.deleteMany).toHaveBeenCalledWith({
        where: { email: "bounce@example.com" },
      });
      expect(mockRedis.del).toHaveBeenCalledWith("blacklist:email:bounce@example.com");

      // Bulk
      await service.removeFromBlacklistBulk(["bounce@example.com", "spam@example.com"]);
      expect(mockEmailBlacklist.deleteMany).toHaveBeenCalledWith({
        where: { email: { in: ["bounce@example.com", "spam@example.com"] } },
      });
      expect(mockRedis.del).toHaveBeenCalledWith([
        "blacklist:email:bounce@example.com",
        "blacklist:email:spam@example.com",
      ]);
    });

    it("should update blacklist reason", async () => {
      await service.updateBlacklistReason("bounce@example.com", "manual");
      expect(mockEmailBlacklist.update).toHaveBeenCalledWith({
        where: { email: "bounce@example.com" },
        data: { reason: "manual" },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        "blacklist:email:bounce@example.com",
        "1",
        "EX",
        604800,
      );
    });

    it("should sync cache in bulk", async () => {
      mockEmailBlacklist.findMany.mockResolvedValueOnce([{ email: "bounce@example.com" }]);

      await service.syncCacheBulk(["bounce@example.com", "clean@example.com"]);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "blacklist:email:bounce@example.com",
        "1",
        "EX",
        604800,
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        "blacklist:email:clean@example.com",
        "0",
        "EX",
        604800,
      );
    });

    it("should support adding emails to blacklist in bulk and pipeline to cache", async () => {
      mockEmailBlacklist.upsert.mockResolvedValue({
        id: 1,
        email: "bulk@example.com",
        reason: "bounce",
      });

      await service.addToBlacklistBulk([
        { email: "bulk1@example.com", reason: "bounce" },
        { email: "bulk2@example.com", reason: "complaint" },
      ]);

      expect(mockEmailBlacklist.upsert).toHaveBeenCalledTimes(2);
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledTimes(2);
      expect(mockPipeline.set).toHaveBeenCalledWith(
        "blacklist:email:bulk1@example.com",
        "1",
        "EX",
        604800,
      );
      expect(mockPipeline.set).toHaveBeenCalledWith(
        "blacklist:email:bulk2@example.com",
        "1",
        "EX",
        604800,
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe("sendDirectEmail and global variables injection", () => {
    it("should fetch settings, generate signed JWT unsubscribe URL and dispatch compiled layout email", async () => {
      const mockSettings = [
        { key: "notification.email.logo_url", value: "https://my-logo.com/img.png" },
        { key: "notification.email.copyright_text", value: "© %Y Custom Brand" },
        { key: "notification.email.custom_css", value: ".brand-color { color: green; }" },
        { key: "notification.email.support_email", value: "help@brand.com" },
      ];
      vi.mocked(prisma.setting.findMany).mockResolvedValue(mockSettings as unknown as Setting[]);

      mockTemplateRepo.findByType.mockImplementation(async (type) => {
        if (type === "layout.default") {
          return {
            id: 99,
            type: "layout.default",
            emailBodyTemplate: {
              en: "<html><head><style>{{customCss}}</style></head><body><img src='{{logoUrl}}' /><div class='body'>{{{body}}}</div>{{copyrightText}} - {{supportEmail}} - <a href='{{unsubscribeUrl}}'>Unsubscribe</a></body></html>",
            },
            channelEmail: true,
          };
        }
        if (type === "auth.welcome") {
          return {
            id: 100,
            type: "auth.welcome",
            emailSubjectTemplate: { en: "Welcome Subject" },
            emailBodyTemplate: { en: "Welcome Body" },
            channelEmail: true,
          };
        }
        return null;
      });

      await service.sendDirectEmail({
        type: "auth.welcome",
        emailRecipient: "recipient@ecom.com",
        variables: {},
        locale: "en",
      });

      expect(sendEmail).toHaveBeenCalled();
      const callArgs = (sendEmail as Mock).mock.calls[0][0];
      expect(callArgs.to).toBe("recipient@ecom.com");
      expect(callArgs.html).toContain("https://my-logo.com/img.png");
      expect(callArgs.html).toContain(".brand-color { color: green; }");
      expect(callArgs.html).toContain("Custom Brand");
      expect(callArgs.html).toContain("help@brand.com");
      expect(callArgs.html).toContain("unsubscribe?token=");
    });
  });
});
