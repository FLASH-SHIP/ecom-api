import { getCustomerRepository } from "@ecom/features/di/containers/CustomerService";
import { getUserRepository } from "@ecom/features/di/containers/RbacService";
import { DeviceTokenRepository } from "@ecom/features/notification/repositories/DeviceTokenRepository";
import { NotificationRepository } from "@ecom/features/notification/repositories/NotificationRepository";
import { NotificationSettingRepository } from "@ecom/features/notification/repositories/NotificationSettingRepository";
import { NotificationTemplateRepository } from "@ecom/features/notification/repositories/NotificationTemplateRepository";
import { ScheduledNotificationRepository } from "@ecom/features/notification/repositories/ScheduledNotificationRepository";
import { DeviceTokenService } from "@ecom/features/notification/services/DeviceTokenService";
import { NotificationService } from "@ecom/features/notification/services/NotificationService";
import { NotificationSettingService } from "@ecom/features/notification/services/NotificationSettingService";
import { NotificationTemplateService } from "@ecom/features/notification/services/NotificationTemplateService";
import { PushNotificationService } from "@ecom/features/notification/services/PushNotificationService";
import { ScheduledNotificationService } from "@ecom/features/notification/services/ScheduledNotificationService";

let _notificationService: NotificationService | null = null;
let _deviceTokenService: DeviceTokenService | null = null;
let _notificationSettingService: NotificationSettingService | null = null;
let _pushNotificationService: PushNotificationService | null = null;
let _notificationTemplateService: NotificationTemplateService | null = null;
let _scheduledNotificationService: ScheduledNotificationService | null = null;

export function getDeviceTokenService(): DeviceTokenService {
  if (!_deviceTokenService) {
    const deviceTokenRepo = new DeviceTokenRepository();
    _deviceTokenService = new DeviceTokenService({
      deviceTokenRepo,
      config: {
        maxTokensPerOwner: Number(process.env.NOTIFICATION_MAX_TOKENS_PER_OWNER) || 10,
      },
    });
  }
  return _deviceTokenService;
}

export function getNotificationSettingService(): NotificationSettingService {
  if (!_notificationSettingService) {
    const notificationSettingRepo = new NotificationSettingRepository();
    _notificationSettingService = new NotificationSettingService({ notificationSettingRepo });
  }
  return _notificationSettingService;
}

export function getPushNotificationService(): PushNotificationService {
  if (!_pushNotificationService) {
    _pushNotificationService = new PushNotificationService({
      serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    });
  }
  return _pushNotificationService;
}

export function getNotificationService(): NotificationService {
  if (!_notificationService) {
    const notificationRepo = new NotificationRepository();
    const deviceTokenService = getDeviceTokenService();
    const notificationSettingService = getNotificationSettingService();
    const pushNotificationService = getPushNotificationService();
    const templateRepo = new NotificationTemplateRepository();
    const userRepo = getUserRepository();
    const customerRepo = getCustomerRepository();

    _notificationService = new NotificationService({
      notificationRepo,
      deviceTokenService,
      notificationSettingService,
      pushNotificationService,
      templateRepo,
      userRepo,
      customerRepo,
      config: {
        deduplicationTtlSec: Number(process.env.NOTIFICATION_DEDUPLICATION_TTL_SEC) || 86400,
        dndDefaultStart: process.env.NOTIFICATION_DND_DEFAULT_START || "22:00",
        dndDefaultEnd: process.env.NOTIFICATION_DND_DEFAULT_END || "06:00",
        timezone: process.env.NOTIFICATION_TIMEZONE || "Asia/Ho_Chi_Minh",
        smartRoutingFallbackSec: Number(process.env.NOTIFICATION_SMART_ROUTING_FALLBACK_SEC) || 600,
        jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret",
        apiUrl: process.env.API_URL || "http://localhost:3000",
      },
    });
  }
  return _notificationService;
}

export function getNotificationTemplateService(): NotificationTemplateService {
  if (!_notificationTemplateService) {
    const templateRepo = new NotificationTemplateRepository();
    _notificationTemplateService = new NotificationTemplateService({ templateRepo });
  }
  return _notificationTemplateService;
}

export function getScheduledNotificationService(): ScheduledNotificationService {
  if (!_scheduledNotificationService) {
    const scheduledRepo = new ScheduledNotificationRepository();
    const notificationService = getNotificationService();
    const userRepo = getUserRepository();
    const customerRepo = getCustomerRepository();

    _scheduledNotificationService = new ScheduledNotificationService({
      scheduledRepo,
      notificationService,
      userRepo,
      customerRepo,
    });
  }
  return _scheduledNotificationService;
}

export function resetNotificationContainers(): void {
  _notificationService = null;
  _deviceTokenService = null;
  _notificationSettingService = null;
  _pushNotificationService = null;
  _notificationTemplateService = null;
  _scheduledNotificationService = null;
}
