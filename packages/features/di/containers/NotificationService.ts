import { DeviceTokenRepository } from "@ecom/features/notification/repositories/DeviceTokenRepository";
import { NotificationRepository } from "@ecom/features/notification/repositories/NotificationRepository";
import { NotificationSettingRepository } from "@ecom/features/notification/repositories/NotificationSettingRepository";
import { DeviceTokenService } from "@ecom/features/notification/services/DeviceTokenService";
import { NotificationService } from "@ecom/features/notification/services/NotificationService";
import { NotificationSettingService } from "@ecom/features/notification/services/NotificationSettingService";
import { PushNotificationService } from "@ecom/features/notification/services/PushNotificationService";

let _notificationService: NotificationService | null = null;
let _deviceTokenService: DeviceTokenService | null = null;
let _notificationSettingService: NotificationSettingService | null = null;
let _pushNotificationService: PushNotificationService | null = null;

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

    _notificationService = new NotificationService({
      notificationRepo,
      deviceTokenService,
      notificationSettingService,
      pushNotificationService,
      config: {
        deduplicationTtlSec: Number(process.env.NOTIFICATION_DEDUPLICATION_TTL_SEC) || 86400,
        dndDefaultStart: process.env.NOTIFICATION_DND_DEFAULT_START || "22:00",
        dndDefaultEnd: process.env.NOTIFICATION_DND_DEFAULT_END || "06:00",
        timezone: process.env.NOTIFICATION_TIMEZONE || "Asia/Ho_Chi_Minh",
      },
    });
  }
  return _notificationService;
}
