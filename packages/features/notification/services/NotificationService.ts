import type { NotificationRepository } from "../repositories/NotificationRepository";

interface INotificationServiceDeps {
  notificationRepo: NotificationRepository;
}

export class NotificationService {
  private deps: INotificationServiceDeps;
  constructor(deps: INotificationServiceDeps) {
    this.deps = deps;
  }

  async notify(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    referenceId?: number;
    referenceType?: string;
  }) {
    return this.deps.notificationRepo.create(data);
  }

  /** Send notification to all users with a specific role (e.g., admins) */
  async notifyUsers(
    userIds: string[],
    data: {
      type: string;
      title: string;
      message: string;
      link?: string;
      referenceId?: number;
      referenceType?: string;
    },
  ) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.deps.notificationRepo.create({ ...data, userId });
      results.push(result);
    }
    return results;
  }

  async listNotifications(
    userId: string,
    options?: { page?: number; perPage?: number; unreadOnly?: boolean },
  ) {
    return this.deps.notificationRepo.findByUser(userId, options);
  }

  async getUnreadCount(userId: string) {
    return this.deps.notificationRepo.getUnreadCount(userId);
  }

  async markRead(id: number, userId: string) {
    return this.deps.notificationRepo.markRead(id, userId);
  }

  async markAllRead(userId: string) {
    return this.deps.notificationRepo.markAllRead(userId);
  }

  async deleteNotification(id: number, userId: string) {
    return this.deps.notificationRepo.delete(id, userId);
  }
}
