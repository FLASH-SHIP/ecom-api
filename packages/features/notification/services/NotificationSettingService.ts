import { NOTIFICATION_EVENTS } from "../config/NotificationTypes";
import type { NotificationSettingRepository } from "../repositories/NotificationSettingRepository";

interface INotificationSettingServiceDeps {
  notificationSettingRepo: NotificationSettingRepository;
}

export class NotificationSettingService {
  private deps: INotificationSettingServiceDeps;

  constructor(deps: INotificationSettingServiceDeps) {
    this.deps = deps;
  }

  /**
   * Resolves the full list of preferences for a given user or customer,
   * merging schema-defined defaults with database overrides.
   */
  async getPreferences(params: { userId?: string; customerId?: string }) {
    const targetType = params.userId ? "USER" : "CUSTOMER";

    // Filter config schema by target type
    const schemas = NOTIFICATION_EVENTS.filter((e) => e.target === targetType);

    // Fetch overrides from database
    const dbOverrides = await this.deps.notificationSettingRepo.findByOwner(params);
    const overridesMap = new Map(dbOverrides.map((o) => [o.eventType, o]));

    return schemas.map((schema) => {
      const override = overridesMap.get(schema.type);

      const inApp = schema.channels.inApp.mandatory
        ? true
        : (override?.channelInApp ?? schema.channels.inApp.default);

      const push = schema.channels.push.mandatory
        ? true
        : (override?.channelPush ?? schema.channels.push.default);

      const email = schema.channels.email.mandatory
        ? true
        : (override?.channelEmail ?? schema.channels.email.default);

      const webhook = schema.channels.webhook.mandatory
        ? true
        : (override?.channelWebhook ?? schema.channels.webhook.default);

      return {
        eventType: schema.type,
        category: schema.category,
        labelKey: schema.labelKey,
        descriptionKey: schema.descriptionKey,
        channels: {
          inApp: { value: inApp, mandatory: schema.channels.inApp.mandatory },
          push: { value: push, mandatory: schema.channels.push.mandatory },
          email: { value: email, mandatory: schema.channels.email.mandatory },
          webhook: { value: webhook, mandatory: schema.channels.webhook.mandatory },
        },
        dndConfig: override?.dndConfig || null,
      };
    });
  }

  /**
   * Updates preference settings for a user/customer.
   */
  async updatePreference(
    params: { userId?: string; customerId?: string },
    eventType: string,
    channels: {
      inApp?: boolean;
      push?: boolean;
      email?: boolean;
      webhook?: boolean;
      dndConfig?: unknown;
    },
  ) {
    const targetType = params.userId ? "USER" : "CUSTOMER";
    const schema = NOTIFICATION_EVENTS.find((e) => e.type === eventType && e.target === targetType);

    if (!schema) {
      throw new Error(`Invalid event type "${eventType}" for target type "${targetType}"`);
    }

    // Load active settings to merge
    const currentPreferences = await this.getPreferences(params);
    const activePref = currentPreferences.find((p) => p.eventType === eventType);

    // Resolve channel values, respecting mandatory overrides
    const resolvedInApp = schema.channels.inApp.mandatory
      ? true
      : (channels.inApp ?? activePref?.channels.inApp.value ?? schema.channels.inApp.default);

    const resolvedPush = schema.channels.push.mandatory
      ? true
      : (channels.push ?? activePref?.channels.push.value ?? schema.channels.push.default);

    const resolvedEmail = schema.channels.email.mandatory
      ? true
      : (channels.email ?? activePref?.channels.email.value ?? schema.channels.email.default);

    const resolvedWebhook = schema.channels.webhook.mandatory
      ? true
      : (channels.webhook ?? activePref?.channels.webhook.value ?? schema.channels.webhook.default);

    return this.deps.notificationSettingRepo.upsertSetting({
      userId: params.userId || null,
      customerId: params.customerId || null,
      eventType,
      channelInApp: resolvedInApp,
      channelPush: resolvedPush,
      channelEmail: resolvedEmail,
      channelWebhook: resolvedWebhook,
      dndConfig: channels.dndConfig,
    });
  }
}
