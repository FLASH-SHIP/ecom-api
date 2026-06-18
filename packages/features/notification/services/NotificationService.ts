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
    userId: number;
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
    userIds: number[],
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
    userId: number,
    options?: { page?: number; perPage?: number; unreadOnly?: boolean },
  ) {
    return this.deps.notificationRepo.findByUser(userId, options);
  }

  async getUnreadCount(userId: number) {
    return this.deps.notificationRepo.getUnreadCount(userId);
  }

  async markRead(id: number, userId: number) {
    return this.deps.notificationRepo.markRead(id, userId);
  }

  async markAllRead(userId: number) {
    return this.deps.notificationRepo.markAllRead(userId);
  }

  async deleteNotification(id: number, userId: number) {
    return this.deps.notificationRepo.delete(id, userId);
  }
}
