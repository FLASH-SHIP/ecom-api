import { NotificationRepository } from "@ecom/features/notification/repositories/NotificationRepository";
import { NotificationService } from "@ecom/features/notification/services/NotificationService";

let _instance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!_instance) {
    const notificationRepo = new NotificationRepository();
    _instance = new NotificationService({ notificationRepo });
  }
  return _instance;
}
