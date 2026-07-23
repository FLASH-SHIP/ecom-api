import type { NotificationTemplateRepository } from "../repositories/NotificationTemplateRepository";

interface ITemplateServiceDeps {
  templateRepo: NotificationTemplateRepository;
}

export class NotificationTemplateService {
  constructor(private deps: ITemplateServiceDeps) {}

  async listTemplates() {
    return this.deps.templateRepo.list();
  }

  async getTemplateByType(type: string) {
    return this.deps.templateRepo.findByType(type);
  }

  async getTemplateById(id: number) {
    return this.deps.templateRepo.findById(id);
  }

  async createTemplate(data: {
    type: string;
    titleTemplate: Record<string, string>;
    messageTemplate: Record<string, string>;
    emailSubjectTemplate?: Record<string, string> | null;
    emailBodyTemplate?: Record<string, string> | null;
    variables?: Record<string, string>;
    channelInApp?: boolean;
    channelPush?: boolean;
    channelEmail?: boolean;
    layoutType?: string | null;
  }) {
    return this.deps.templateRepo.create(data);
  }

  async updateTemplate(
    id: number,
    data: {
      titleTemplate?: Record<string, string>;
      messageTemplate?: Record<string, string>;
      emailSubjectTemplate?: Record<string, string> | null;
      emailBodyTemplate?: Record<string, string> | null;
      variables?: Record<string, string>;
      channelInApp?: boolean;
      channelPush?: boolean;
      channelEmail?: boolean;
      layoutType?: string | null;
    },
  ) {
    const updated = await this.deps.templateRepo.update(id, data);
    try {
      const { RedisCache } = await import("@ecom/lib/redis");
      const cache = new RedisCache("notification-templates");
      await cache.invalidate(updated.type);
    } catch (err) {
      console.error("[TemplateService] Failed to clear Redis cache on update:", err);
    }
    return updated;
  }

  async deleteTemplate(id: number) {
    const deleted = await this.deps.templateRepo.delete(id);
    try {
      const { RedisCache } = await import("@ecom/lib/redis");
      const cache = new RedisCache("notification-templates");
      await cache.invalidate(deleted.type);
    } catch (err) {
      console.error("[TemplateService] Failed to clear Redis cache on delete:", err);
    }
    return deleted;
  }
}
