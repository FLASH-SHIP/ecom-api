import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import type { UserRepository } from "@ecom/features/rbac/repositories/UserRepository";
import { type NotificationTemplate, type Prisma, prisma } from "@ecom/prisma";
import {
  escapeHtml,
  formatEmailBody,
  sendEmail,
  stripHtml,
  wrapEmailLayout,
} from "@flash-ship/ecom-emails";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import { getRedisClient, RedisCache } from "@flash-ship/ecom-lib/redis";
import { sanitizeRichHtml } from "@flash-ship/ecom-lib/sanitize";
import * as jwt from "jsonwebtoken";
import type { NotificationRepository } from "../repositories/NotificationRepository";
import type { NotificationTemplateRepository } from "../repositories/NotificationTemplateRepository";
import type { DeviceTokenService } from "./DeviceTokenService";
import type { NotificationSettingService } from "./NotificationSettingService";
import type { PushNotificationService } from "./PushNotificationService";

const log = createLogger("NotificationService");

interface INotificationServiceDeps {
  notificationRepo: NotificationRepository;
  notificationSettingService: NotificationSettingService;
  deviceTokenService: DeviceTokenService;
  pushNotificationService: PushNotificationService;
  templateRepo: NotificationTemplateRepository;
  userRepo?: UserRepository;
  customerRepo?: CustomerRepository;
  config?: {
    deduplicationTtlSec?: number;
    dndDefaultStart?: string;
    dndDefaultEnd?: string;
    timezone?: string;
    smartRoutingFallbackSec?: number;
    jwtSecret?: string;
    apiUrl?: string;
  };
}

export class NotificationService {
  private deps: INotificationServiceDeps;
  private templateCache = new RedisCache<NotificationTemplate>("notification-templates", 86400);

  constructor(deps: INotificationServiceDeps) {
    this.deps = deps;
  }

  private async getEmailVariables(
    emailRecipient: string | null | undefined,
    title: string,
    bodyContent: string,
  ): Promise<Record<string, string>> {
    // 1. Load email settings from DB
    const emailSettings = await prisma.setting.findMany({
      where: { key: { startsWith: "notification.email." } },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of emailSettings) {
      if (s.value) {
        settingsMap[s.key] = s.value;
      }
    }

    let unsubscribeUrl = "";
    if (emailRecipient) {
      const jwtSecret = this.deps.config?.jwtSecret || "dev-jwt-secret";
      const unsubscribeToken = jwt.sign({ email: emailRecipient }, jwtSecret, {
        expiresIn: "365d",
      });
      const apiUrl = this.deps.config?.apiUrl || "http://localhost:3000";
      unsubscribeUrl = `${apiUrl}/v2/webhooks/notifications/unsubscribe?token=${unsubscribeToken}`;
    }

    const currentYear = new Date().getFullYear().toString();
    const logoUrl = settingsMap["notification.email.logo_url"] || "";
    const rawCopyright =
      settingsMap["notification.email.copyright_text"] ||
      `© ${currentYear} Ecom. All rights reserved.`;
    const copyrightText = rawCopyright.replace(/%Y/g, currentYear);
    const customCss = settingsMap["notification.email.custom_css"] || "";
    const supportEmail = settingsMap["notification.email.support_email"] || "support@example.com";

    return {
      body: bodyContent,
      title,
      logoUrl,
      copyrightText,
      customCss,
      supportEmail,
      unsubscribeUrl,
    };
  }

  private compileTemplate(
    tpl: string,
    vars: Record<string, unknown> = {},
    shouldEscape = false,
  ): string {
    // 1. Compile triple curly braces {{{var}}} representing safe/rich HTML
    let compiled = tpl.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, path) => {
      const value = this.getNestedValue(vars, path);
      if (value === undefined) {
        log.warn(`Template variable "${path}" is missing in payload`, { vars });
        return "";
      }
      return sanitizeRichHtml(String(value));
    });

    // 2. Compile double curly braces {{var}} representing standard text variables
    compiled = compiled.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const value = this.getNestedValue(vars, path);
      if (value === undefined) {
        log.warn(`Template variable "${path}" is missing in payload`, { vars });
        return "";
      }
      const strValue = String(value);
      return shouldEscape ? escapeHtml(strValue) : strValue;
    });

    return compiled;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((acc, part) => {
      if (acc && typeof acc === "object" && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj as unknown);
  }

  private async acquireIdempotency(key: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const ttl = this.deps.config?.deduplicationTtlSec ?? 86400;
      const acquired = await redis.set(`idem:${key}`, "1", "EX", ttl, "NX");
      return !!acquired;
    } catch (err) {
      log.error("Failed to check idempotency key in Redis, proceeding...", { err });
      return true; // Proceed anyway if Redis is down
    }
  }

  private async getDndConfig(
    dndConfig: unknown,
  ): Promise<{ enabled: boolean; start: string; end: string }> {
    if (dndConfig) {
      const dnd =
        typeof dndConfig === "string"
          ? JSON.parse(dndConfig)
          : (dndConfig as Record<string, unknown>);

      if (dnd && typeof dnd.enabled === "boolean") {
        return {
          enabled: dnd.enabled,
          start: String(dnd.start || "22:00"),
          end: String(dnd.end || "07:00"),
        };
      }
    }

    try {
      const { getSettingService } = await import("@ecom/features/di/containers/SettingService");
      const settingSvc = getSettingService();
      const allSettings = await settingSvc.getAll();
      return {
        enabled: allSettings["notification.quiet_hours.enabled"] !== "false",
        start:
          allSettings["notification.quiet_hours.start"] ||
          this.deps.config?.dndDefaultStart ||
          "22:00",
        end:
          allSettings["notification.quiet_hours.end"] || this.deps.config?.dndDefaultEnd || "07:00",
      };
    } catch (err) {
      log.warn("Failed fetching global quiet hours settings, using defaults", { err });
      return {
        enabled: true,
        start: this.deps.config?.dndDefaultStart || "22:00",
        end: this.deps.config?.dndDefaultEnd || "07:00",
      };
    }
  }

  private async isQuietHours(dndConfig: unknown, deliveryClass?: string): Promise<boolean> {
    if (deliveryClass === "TRANSACTIONAL") return false;

    try {
      const { enabled, start, end } = await this.getDndConfig(dndConfig);
      if (!enabled) return false;

      const now = new Date();
      const tz = this.deps.config?.timezone || "Asia/Ho_Chi_Minh";
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const currentTimeString = formatter.format(now);

      if (start < end) {
        return currentTimeString >= start && currentTimeString <= end;
      }
      return currentTimeString >= start || currentTimeString <= end;
    } catch (err) {
      log.error("Failed parsing DND config in check", { err });
      return false;
    }
  }

  private async dispatchPush(
    data: {
      userId?: string | null;
      customerId?: string | null;
      type: string;
      titleKey: string;
      messageKey: string;
      isSensitive?: boolean;
      referenceId?: string | null;
      referenceType?: string | null;
    },
    notificationRecord: { id: number } | null,
  ): Promise<void> {
    const deviceTokens = await this.deps.deviceTokenService.getTokensByOwner({
      userId: data.userId || undefined,
      customerId: data.customerId || undefined,
    });

    const tokens = deviceTokens.map((t) => t.token);
    if (tokens.length === 0) return;

    const pushTitle = data.isSensitive ? "Thông báo mới" : data.titleKey;
    const pushBody = data.isSensitive
      ? "Bạn có thông báo bảo mật mới. Vui lòng mở ứng dụng để xem."
      : data.messageKey;

    const pushResponse = await this.deps.pushNotificationService.sendPushNotification(tokens, {
      title: pushTitle,
      body: pushBody,
      data: {
        notificationId: notificationRecord ? String(notificationRecord.id) : "",
        type: data.type,
        referenceId: data.referenceId || "",
        referenceType: data.referenceType || "",
        isSensitive: data.isSensitive ? "true" : "false",
      },
    });

    if (pushResponse.invalidTokens.length > 0) {
      await this.deps.deviceTokenService.deleteInvalidTokens(pushResponse.invalidTokens);
    }
  }

  private async dispatchEmail(
    recipient: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    await sendEmail({
      to: recipient,
      subject,
      html,
      text,
    });
  }

  private async dispatchWebhook(
    eventType: string,
    notificationId: number | null,
    data: {
      userId?: string | null;
      customerId?: string | null;
      type: string;
      titleKey: string;
      messageKey: string;
      variables?: Record<string, unknown>;
      link?: string | null;
    },
    ownerId: string,
  ): Promise<void> {
    const ownerType = data.userId ? "User" : "Customer";
    try {
      const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
      const webhookSvc = getWebhookService();
      await webhookSvc.dispatch(
        eventType,
        {
          notificationId,
          type: data.type,
          titleKey: data.titleKey,
          messageKey: data.messageKey,
          variables: data.variables || {},
          link: data.link || null,
        },
        { ownerId, ownerType },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("Failed to dispatch webhook for notification", { err: msg });
    }
  }

  private async resolveDeliveryChannels(
    eventType: string,
    userId?: string | null,
    customerId?: string | null,
    deliveryClass?: "TRANSACTIONAL" | "MARKETING",
  ) {
    if (!userId && !customerId) {
      return { inAppAllowed: false, pushAllowed: false, emailAllowed: true, webhookAllowed: false };
    }

    const preferences = await this.deps.notificationSettingService.getPreferences({
      userId: userId || undefined,
      customerId: customerId || undefined,
    });

    const preference = preferences.find((p) => p.eventType === eventType);
    const inAppAllowed = preference?.channels.inApp.value ?? true;
    let pushAllowed = preference?.channels.push.value ?? true;
    const emailAllowed = preference?.channels.email.value ?? true;
    const webhookAllowed = preference?.channels.webhook.value ?? false;

    // Check Quiet Hours DND configuration
    const ownerId = userId || customerId;
    if (await this.isQuietHours(preference?.dndConfig, deliveryClass)) {
      log.info("Quiet Hours (DND) active. Silencing push dispatches.", { ownerId });
      pushAllowed = false;
    }

    return { inAppAllowed, pushAllowed, emailAllowed, webhookAllowed };
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: compiles database template layouts with fallbacks
  private async handleEmailDispatch(
    notificationRecord: { id: number } | null,
    pushAllowed: boolean,
    emailAllowed: boolean,
    data: {
      titleKey: string;
      messageKey: string;
      link?: string | null;
      emailRecipient?: string | null;
    },
    deliveryClass?: "TRANSACTIONAL" | "MARKETING",
    locale = "vi",
    layoutOverride?: string | null,
  ): Promise<void> {
    if (!emailAllowed || !data.emailRecipient) return;

    // Compile email HTML and text content
    const formattedBody = formatEmailBody(data.messageKey);
    const bodyContent = data.link
      ? `${formattedBody}<p style="margin-top: 20px;"><a href="${data.link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Xem chi tiết</a></p>`
      : formattedBody;

    // Load layout template from cache/DB
    const layoutType =
      layoutOverride || (deliveryClass === "MARKETING" ? "layout.marketing" : "layout.default");
    let layoutTemplate: NotificationTemplate | null = null;
    try {
      const cached = await this.templateCache.get(layoutType);
      if (cached !== undefined) {
        layoutTemplate = cached;
      } else {
        layoutTemplate = await this.deps.templateRepo.findByType(layoutType);
        if (layoutTemplate) {
          await this.templateCache.set(layoutType, layoutTemplate);
        }
      }
    } catch (err) {
      log.error("Failed loading layout template from cache/db", { err });
    }

    let emailHtml: string;
    if (layoutTemplate) {
      const emailBodyMap = (layoutTemplate.emailBodyTemplate as Record<string, string>) || {};
      const layoutHtmlTpl = emailBodyMap[locale] || emailBodyMap.en || "";
      const emailVars = await this.getEmailVariables(
        data.emailRecipient,
        data.titleKey,
        bodyContent,
      );
      emailHtml = this.compileTemplate(layoutHtmlTpl, emailVars, false);
      if (emailVars.customCss && !layoutHtmlTpl.includes("customCss")) {
        emailHtml = emailHtml.replace(/<\/head>/i, `<style>${emailVars.customCss}</style></head>`);
      }
    } else {
      emailHtml = wrapEmailLayout(bodyContent);
    }
    const emailText = stripHtml(bodyContent);

    const smartRoutingSec = this.deps.config?.smartRoutingFallbackSec ?? 600;
    if (pushAllowed && notificationRecord) {
      try {
        const { queueFallbackEmail } = await import(
          "@ecom/features/queue/workers/fallbackEmailWorker"
        );
        await queueFallbackEmail(
          {
            notificationId: notificationRecord.id,
            to: data.emailRecipient,
            subject: data.titleKey,
            html: emailHtml,
            text: emailText,
          },
          smartRoutingSec * 1000,
        );
        log.info("Enqueued delayed smart routing fallback email", {
          notificationId: notificationRecord.id,
          delaySec: smartRoutingSec,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error("Failed to queue fallback email, sending immediately", { err: msg });
        await this.dispatchEmail(data.emailRecipient, data.titleKey, emailHtml, emailText);
      }
    } else {
      await this.dispatchEmail(data.emailRecipient, data.titleKey, emailHtml, emailText);
    }
  }

  /**
   * Main dispatch method to send a notification to a User or Customer
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy method complexity
  async notify(data: {
    userId?: string | null;
    customerId?: string | null;
    type: string;
    titleKey: string;
    messageKey: string;
    variables?: Record<string, unknown>;
    link?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    isSensitive?: boolean;
    deliveryClass?: "TRANSACTIONAL" | "MARKETING";
    idempotencyKey?: string | null;
    emailRecipient?: string | null; // Optional email to override default lookup
  }) {
    if (data.idempotencyKey) {
      const isUnique = await this.acquireIdempotency(data.idempotencyKey);
      if (!isUnique) return null;
    }

    const ownerId = data.userId || data.customerId;
    if (!ownerId && !data.emailRecipient) {
      log.error("No recipient (userId, customerId or emailRecipient) provided for notification");
      return null;
    }

    // Resolve Recipient's Locale
    let locale = "vi";
    if (data.userId && this.deps.userRepo) {
      const user = await this.deps.userRepo.findById(data.userId);
      if (user?.locale) {
        locale = user.locale;
      }
    } else if (data.customerId && this.deps.customerRepo) {
      const customer = await this.deps.customerRepo.findById(data.customerId);
      const metadata = customer?.metadata as Record<string, unknown> | null;
      if (metadata?.locale && typeof metadata.locale === "string") {
        locale = metadata.locale;
      }
    }

    // Fetch & Compile Template
    let titleKey = data.titleKey;
    let messageKey = data.messageKey;
    let emailSubjectKey = data.titleKey;
    let emailBodyKey = data.messageKey;
    let inAppEnabled = true;
    let pushEnabled = true;
    let emailEnabled = true;

    let template: NotificationTemplate | null = null;
    try {
      const cached = await this.templateCache.get(data.type);
      if (cached !== undefined) {
        template = cached;
      } else {
        template = await this.deps.templateRepo.findByType(data.type);
        if (template) {
          await this.templateCache.set(data.type, template);
        }
      }
    } catch (err) {
      log.error("Failed loading template from cache/db", { err });
    }

    if (template) {
      if (template.variables && typeof template.variables === "object") {
        const declaredVars = template.variables as Record<string, unknown>;
        if (Object.keys(declaredVars).length > 0) {
          const missing: string[] = [];
          for (const key of Object.keys(declaredVars)) {
            const val = this.getNestedValue(data.variables || {}, key);
            if (val === undefined || val === null || val === "") {
              missing.push(key);
            }
          }
          if (missing.length > 0) {
            throw new Error(
              `Missing required template variables for ${data.type}: ${missing.join(", ")}`,
            );
          }
        }
      }
      const titleMap = (template.titleTemplate as Record<string, string>) || {};
      const messageMap = (template.messageTemplate as Record<string, string>) || {};
      const emailSubjectMap = (template.emailSubjectTemplate as Record<string, string>) || {};
      const emailBodyMap = (template.emailBodyTemplate as Record<string, string>) || {};

      const titleTpl = titleMap[locale] || titleMap.en || "";
      const messageTpl = messageMap[locale] || messageMap.en || "";
      const emailSubjectTpl = emailSubjectMap[locale] || emailSubjectMap.en || titleTpl;
      const emailBodyTpl = emailBodyMap[locale] || emailBodyMap.en || messageTpl;

      const compiledTitle = this.compileTemplate(titleTpl, data.variables || {}, false);
      const compiledMessage = this.compileTemplate(messageTpl, data.variables || {}, false);
      const compiledEmailSubject = this.compileTemplate(
        emailSubjectTpl,
        data.variables || {},
        false,
      );
      const compiledEmailBody = this.compileTemplate(emailBodyTpl, data.variables || {}, true);

      if (compiledTitle) titleKey = compiledTitle;
      if (compiledMessage) messageKey = compiledMessage;
      emailSubjectKey = compiledEmailSubject || titleKey;
      emailBodyKey = compiledEmailBody || messageKey;

      inAppEnabled = template.channelInApp;
      pushEnabled = template.channelPush;
      emailEnabled = template.channelEmail;
    }

    const { inAppAllowed, pushAllowed, emailAllowed, webhookAllowed } =
      await this.resolveDeliveryChannels(
        data.type,
        data.userId,
        data.customerId,
        data.deliveryClass,
      );

    // Apply template enabled flags to dynamic routing logic
    const finalInApp = inAppAllowed && inAppEnabled;
    const finalPush = pushAllowed && pushEnabled;
    const finalEmail = emailAllowed && emailEnabled;

    let notificationRecord = null;

    // Dispatch In-App
    if (finalInApp) {
      notificationRecord = await this.deps.notificationRepo.create({
        userId: data.userId,
        customerId: data.customerId,
        type: data.type,
        titleKey,
        messageKey,
        variables: data.variables,
        link: data.link,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        isSensitive: data.isSensitive,
        deliveryClass: data.deliveryClass,
        idempotencyKey: data.idempotencyKey,
        sentAt: new Date(),
      });
    }

    // Dispatch Push Notification
    if (finalPush) {
      await this.dispatchPush(
        {
          ...data,
          titleKey,
          messageKey,
        },
        notificationRecord,
      );
    }

    // Check blacklist if email recipient is provided
    let isBlacklisted = false;
    if (finalEmail && data.emailRecipient) {
      isBlacklisted = await this.isEmailBlacklisted(data.emailRecipient, data.deliveryClass);
      if (isBlacklisted) {
        log.info(`Skipped email dispatch: recipient ${data.emailRecipient} is blacklisted`);
      }
    }

    // Dispatch Email Notification (with smart routing failover check)
    await this.handleEmailDispatch(
      notificationRecord,
      finalPush,
      finalEmail && !isBlacklisted,
      {
        ...data,
        titleKey: emailSubjectKey,
        messageKey: emailBodyKey,
      },
      data.deliveryClass,
      locale,
      template?.layoutType,
    );

    // Dispatch Webhook Notification
    if (webhookAllowed && ownerId) {
      const notificationId = notificationRecord ? notificationRecord.id : null;
      await this.dispatchWebhook(
        data.type,
        notificationId,
        {
          ...data,
          titleKey,
          messageKey,
        },
        ownerId,
      );
    }

    return notificationRecord;
  }

  // ─── Backward-compatible wrappers and direct database operations ───

  async listNotifications(
    ownerId: string,
    options?: {
      page?: number;
      cursor?: number;
      perPage?: number;
      unreadOnly?: boolean;
      isCustomer?: boolean;
      search?: string;
      type?: string;
    },
  ) {
    const isCustomer = options?.isCustomer ?? false;

    // Use cursor-based pagination if cursor is provided
    if (options?.cursor !== undefined) {
      return this.deps.notificationRepo.findByOwner(
        {
          userId: !isCustomer ? ownerId : undefined,
          customerId: isCustomer ? ownerId : undefined,
        },
        {
          cursor: options.cursor,
          perPage: options.perPage,
          unreadOnly: options.unreadOnly,
          search: options.search,
          type: options.type,
        },
      );
    }

    // Fallback to offset pagination
    if (!isCustomer) {
      return this.deps.notificationRepo.findByUser(ownerId, {
        page: options?.page,
        perPage: options?.perPage,
        unreadOnly: options?.unreadOnly,
        search: options?.search,
        type: options?.type,
      });
    }

    // Offset pagination fallback for customer using findByOwner without cursor
    return this.deps.notificationRepo.findByOwner(
      { customerId: ownerId },
      {
        perPage: options?.perPage,
        unreadOnly: options?.unreadOnly,
        search: options?.search,
        type: options?.type,
      },
    );
  }

  async getUnreadCount(ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.getUnreadCount({
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async markRead(id: number, ownerId: string, isRead = true, isCustomer = false) {
    return this.deps.notificationRepo.markRead(id, isRead, {
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async markAllRead(ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.markAllRead({
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async deleteNotification(id: number, ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.delete(id, {
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async recordDelivered(id: number) {
    return this.deps.notificationRepo.updateTracking(id, "delivered");
  }

  async recordClicked(id: number) {
    return this.deps.notificationRepo.updateTracking(id, "clicked");
  }

  async cleanOldHistory(readDays: number, unreadDays: number) {
    return this.deps.notificationRepo.purgeOldNotifications({
      readPurgeDays: readDays,
      unreadPurgeDays: unreadDays,
    });
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preview method complexity
  async previewTemplate(params: {
    type?: string;
    templateId?: number;
    customEmailBody?: string;
    customEmailSubject?: string;
    variables: Record<string, unknown>;
    locale?: string;
    emailRecipient?: string;
  }): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    const locale = params.locale || "vi";
    let subjectTpl = params.customEmailSubject || "";
    let bodyTpl = params.customEmailBody || "";

    if (!subjectTpl || !bodyTpl) {
      let template: NotificationTemplate | null = null;
      if (params.templateId) {
        template = await this.deps.templateRepo.findById(params.templateId);
      } else if (params.type) {
        template = await this.deps.templateRepo.findByType(params.type);
      }

      if (template) {
        const emailSubjectMap = (template.emailSubjectTemplate as Record<string, string>) || {};
        const emailBodyMap = (template.emailBodyTemplate as Record<string, string>) || {};
        const titleMap = (template.titleTemplate as Record<string, string>) || {};
        const messageMap = (template.messageTemplate as Record<string, string>) || {};

        if (!subjectTpl) {
          subjectTpl =
            emailSubjectMap[locale] || emailSubjectMap.en || titleMap[locale] || titleMap.en || "";
        }
        if (!bodyTpl) {
          bodyTpl =
            emailBodyMap[locale] || emailBodyMap.en || messageMap[locale] || messageMap.en || "";
        }
      }
    }

    const compiledSubject = this.compileTemplate(subjectTpl, params.variables || {}, false);
    const compiledBody = this.compileTemplate(bodyTpl, params.variables || {}, true);

    const formattedBody = formatEmailBody(compiledBody);
    const isMarketing = params.type?.startsWith("marketing.") || false;
    const layoutType = isMarketing ? "layout.marketing" : "layout.default";
    let layoutTemplate: NotificationTemplate | null = null;
    try {
      const cached = await this.templateCache.get(layoutType);
      if (cached !== undefined) {
        layoutTemplate = cached;
      } else {
        layoutTemplate = await this.deps.templateRepo.findByType(layoutType);
        if (layoutTemplate) {
          await this.templateCache.set(layoutType, layoutTemplate);
        }
      }
    } catch (err) {
      log.error("Failed loading layout template from cache/db", { err });
    }

    let emailHtml: string;
    if (layoutTemplate) {
      const emailBodyMap = (layoutTemplate.emailBodyTemplate as Record<string, string>) || {};
      const layoutHtmlTpl = emailBodyMap[locale] || emailBodyMap.en || "";
      const emailVars = await this.getEmailVariables(
        params.emailRecipient,
        compiledSubject,
        formattedBody,
      );
      emailHtml = this.compileTemplate(layoutHtmlTpl, emailVars, false);
      if (emailVars.customCss && !layoutHtmlTpl.includes("customCss")) {
        emailHtml = emailHtml.replace(/<\/head>/i, `<style>${emailVars.customCss}</style></head>`);
      }
    } else {
      emailHtml = wrapEmailLayout(formattedBody);
    }
    const emailText = stripHtml(formattedBody);

    return {
      subject: compiledSubject,
      html: emailHtml,
      text: emailText,
    };
  }

  async sendDirectEmail(params: {
    type: string;
    emailRecipient: string;
    variables?: Record<string, unknown>;
    locale?: string;
  }): Promise<void> {
    const preview = await this.previewTemplate({
      type: params.type,
      variables: params.variables || {},
      locale: params.locale || "vi",
      emailRecipient: params.emailRecipient,
    });

    await this.dispatchEmail(params.emailRecipient, preview.subject, preview.html, preview.text);
  }

  private async getCachedBlacklistReason(email: string): Promise<string | null> {
    try {
      const cached = await getRedisClient().get(`blacklist:email:${email}`);
      if (cached === null) return null;
      if (cached === "0" || cached === "none") return "none";
      if (cached === "1") return "manual";
      return cached;
    } catch (err) {
      log.warn("Redis error checking blacklist cache", { err });
      return null;
    }
  }

  async isEmailBlacklisted(
    email: string,
    deliveryClass?: "TRANSACTIONAL" | "MARKETING",
  ): Promise<boolean> {
    const cacheKey = `blacklist:email:${email}`;
    const redis = getRedisClient();
    let reason = await this.getCachedBlacklistReason(email);

    if (reason === null) {
      const record = await prisma.emailBlacklist.findUnique({
        where: { email },
        select: { reason: true },
      });

      if (record) {
        reason = record.reason;
      } else {
        reason = "none";
      }

      try {
        await redis.set(cacheKey, reason, "EX", 604800);
      } catch (err) {
        log.warn("Redis error setting blacklist cache", { err });
      }
    }

    if (reason === "none") {
      return false;
    }

    // Smart blacklist filtering:
    // If delivery class is TRANSACTIONAL, only block on "bounce" or "manual".
    // Allow transactional emails to pass if the reason is "complaint" (unsubscribed).
    if (deliveryClass === "TRANSACTIONAL" && reason === "complaint") {
      return false;
    }

    return true;
  }

  async listBlacklist(params: { page: number; perPage: number; search?: string }) {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: Prisma.EmailBlacklistWhereInput = {};
    if (params.search) {
      where.email = { contains: params.search, mode: "insensitive" };
    }

    const [items, total, stats] = await Promise.all([
      prisma.emailBlacklist.findMany({
        where,
        orderBy: { id: "desc" },
        take: perPage,
        skip,
      }),
      prisma.emailBlacklist.count({ where }),
      prisma.$transaction([
        prisma.emailBlacklist.count({ where: { reason: "bounce" } }),
        prisma.emailBlacklist.count({ where: { reason: "complaint" } }),
        prisma.emailBlacklist.count({ where: { reason: "manual" } }),
      ]),
    ]);

    return {
      items,
      total,
      page,
      perPage,
      stats: {
        bounce: stats[0],
        complaint: stats[1],
        manual: stats[2],
      },
    };
  }

  async addToBlacklistBulk(entries: { email: string; reason: string }[]) {
    if (entries.length === 0) return;

    await prisma.$transaction(
      entries.map(({ email, reason }) =>
        prisma.emailBlacklist.upsert({
          where: { email },
          create: { email, reason },
          update: { reason },
        }),
      ),
    );

    const redis = getRedisClient();
    try {
      const pipeline = redis.pipeline();
      for (const { email } of entries) {
        const cacheKey = `blacklist:email:${email}`;
        pipeline.set(cacheKey, "1", "EX", 604800);
      }
      await pipeline.exec();
    } catch (err) {
      log.warn("Redis error setting bulk blacklist cache", { err });
    }
  }

  async addToBlacklist(email: string, reason: string) {
    const record = await prisma.emailBlacklist.upsert({
      where: { email },
      create: { email, reason },
      update: { reason },
    });

    const cacheKey = `blacklist:email:${email}`;
    const redis = getRedisClient();
    try {
      await redis.set(cacheKey, "1", "EX", 604800);
    } catch (err) {
      log.warn("Redis error setting blacklist cache", { err });
    }

    return record;
  }

  async removeFromBlacklist(email: string) {
    await prisma.emailBlacklist.deleteMany({
      where: { email },
    });

    const cacheKey = `blacklist:email:${email}`;
    const redis = getRedisClient();
    try {
      await redis.del(cacheKey);
    } catch (err) {
      log.warn("Redis error deleting blacklist cache", { err });
    }
  }

  async removeFromBlacklistBulk(emails: string[]) {
    await prisma.emailBlacklist.deleteMany({
      where: { email: { in: emails } },
    });

    const redis = getRedisClient();
    try {
      const keys = emails.map((email) => `blacklist:email:${email}`);
      await redis.del(keys);
    } catch (err) {
      log.warn("Redis error deleting bulk blacklist cache", { err });
    }
  }

  async updateBlacklistReason(email: string, reason: string) {
    const record = await prisma.emailBlacklist.update({
      where: { email },
      data: { reason },
    });

    const cacheKey = `blacklist:email:${email}`;
    const redis = getRedisClient();
    try {
      await redis.set(cacheKey, "1", "EX", 604800);
    } catch (err) {
      log.warn("Redis error setting blacklist cache", { err });
    }

    return record;
  }

  async syncCacheBulk(emails: string[]) {
    const redis = getRedisClient();
    try {
      const dbRecords = await prisma.emailBlacklist.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      });
      const dbEmails = new Set(dbRecords.map((r) => r.email));

      for (const email of emails) {
        const cacheKey = `blacklist:email:${email}`;
        const isBlacklisted = dbEmails.has(email);
        await redis.set(cacheKey, isBlacklisted ? "1" : "0", "EX", 604800);
      }
    } catch (err) {
      log.warn("Redis error syncing blacklist cache", { err });
    }
  }
}
