import {
  getDeviceTokenService,
  getNotificationService,
  getNotificationSettingService,
  getNotificationTemplateService,
  getScheduledNotificationService,
} from "@ecom/features/di/containers/NotificationService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const listNotifications = authedProcedure
  .input(
    z
      .object({
        page: z.number().int().positive().optional(),
        perPage: z.number().int().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
        cursor: z.number().int().positive().optional(),
        search: z.string().optional(),
        type: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.listNotifications(ctx.user.id, {
      page: input?.page,
      perPage: input?.perPage,
      unreadOnly: input?.unreadOnly,
      cursor: input?.cursor,
      search: input?.search,
      type: input?.type,
      isCustomer: false,
    });
  });

export const unreadCount = authedProcedure.query(async ({ ctx }) => {
  const svc = getNotificationService();
  return svc.getUnreadCount(ctx.user.id, false);
});

export const markRead = authedProcedure
  .input(z.object({ id: z.number().int().positive(), read: z.boolean().optional() }))
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.markRead(input.id, ctx.user.id, input.read ?? true, false);
  });

export const markAllRead = authedProcedure.mutation(async ({ ctx }) => {
  const svc = getNotificationService();
  return svc.markAllRead(ctx.user.id, false);
});

export const deleteNotification = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.deleteNotification(input.id, ctx.user.id, false);
  });

export const registerToken = authedProcedure
  .input(
    z.object({
      token: z.string().min(1),
      platform: z.string().min(1),
      deviceInfo: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const svc = getDeviceTokenService();
    return svc.registerToken({
      userId: ctx.user.id,
      token: input.token,
      platform: input.platform,
      deviceInfo: input.deviceInfo,
    });
  });

export const unregisterToken = authedProcedure
  .input(z.object({ token: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const svc = getDeviceTokenService();
    return svc.unregisterToken(input.token);
  });

export const getPreferences = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_READ))
  .query(async ({ ctx }) => {
    const svc = getNotificationSettingService();
    return svc.getPreferences({ userId: ctx.user.id });
  });

export const updatePreference = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      eventType: z.string().min(1),
      channels: z.object({
        inApp: z.boolean().optional(),
        push: z.boolean().optional(),
        email: z.boolean().optional(),
        webhook: z.boolean().optional(),
      }),
      dndConfig: z.record(z.string(), z.any()).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationSettingService();
    return svc.updatePreference({ userId: ctx.user.id }, input.eventType, {
      inApp: input.channels.inApp,
      push: input.channels.push,
      email: input.channels.email,
      webhook: input.channels.webhook,
      dndConfig: input.dndConfig,
    });
  });

export const listTemplates = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_READ))
  .query(async () => {
    const svc = getNotificationTemplateService();
    return svc.listTemplates();
  });

export const updateTemplate = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      id: z.number().int().positive(),
      titleTemplate: z.record(z.string(), z.string()).optional(),
      messageTemplate: z.record(z.string(), z.string()).optional(),
      emailSubjectTemplate: z.record(z.string(), z.string()).optional(),
      emailBodyTemplate: z.record(z.string(), z.string()).optional(),
      variables: z.record(z.string(), z.string()).optional(),
      channelInApp: z.boolean().optional(),
      channelPush: z.boolean().optional(),
      channelEmail: z.boolean().optional(),
      layoutType: z.string().nullish(),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationTemplateService();
    const { id, ...data } = input;
    const updated = await svc.updateTemplate(id, data);
    if (updated?.type) {
      try {
        const { RedisCache } = await import("@flash-ship/ecom-lib/redis");
        const cache = new RedisCache("notification-templates");
        await cache.invalidate(updated.type);
      } catch {
        // Safe ignore on cache failure
      }
    }
    return updated;
  });

export const resetTemplate = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      id: z.number().int().positive(),
    }),
  )
  .mutation(async ({ input }) => {
    const templateSvc = getNotificationTemplateService();
    const template = await templateSvc.getTemplateById(input.id);
    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template không tồn tại.",
      });
    }

    const { defaultTemplates } = await import(
      "@ecom/features/notification/constants/defaultTemplates"
    );
    const defaults = defaultTemplates[template.type];
    if (!defaults) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Không tìm thấy nội dung mặc định cho mẫu thông báo này.",
      });
    }

    const updated = await templateSvc.updateTemplate(input.id, {
      titleTemplate: defaults.titleTemplate,
      messageTemplate: defaults.messageTemplate,
      emailSubjectTemplate: defaults.emailSubjectTemplate,
      emailBodyTemplate: defaults.emailBodyTemplate,
    });

    return updated;
  });

export const sendTestTemplate = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      id: z.number().int().positive(),
      emailRecipient: z.string().email(),
      variables: z.record(z.string(), z.any()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const templateSvc = getNotificationTemplateService();
    const template = await templateSvc.getTemplateById(input.id);
    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found",
      });
    }

    const svc = getNotificationService();
    await svc.sendDirectEmail({
      type: template.type,
      emailRecipient: input.emailRecipient,
      variables: input.variables || {},
    });

    return { success: true };
  });

export const listScheduled = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_BROADCAST_READ))
  .input(
    z.object({
      page: z.number().int().positive().default(1),
      perPage: z.number().int().min(1).max(50).default(20),
    }),
  )
  .query(async ({ input }) => {
    const svc = getScheduledNotificationService();
    return svc.list(input);
  });

export const createScheduled = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_BROADCAST_CREATE))
  .input(
    z.object({
      targetType: z.string().min(1),
      targetIds: z.array(z.string()).optional(),
      title: z.string().min(1),
      message: z.string().min(1),
      link: z.string().nullish(),
      scheduledAt: z.coerce.date(),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getScheduledNotificationService();
    return svc.create(input);
  });

export const deleteScheduled = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_BROADCAST_DELETE))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getScheduledNotificationService();
    return svc.delete(input.id);
  });

export const previewTemplate = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_READ))
  .input(
    z.object({
      type: z.string().optional(),
      templateId: z.number().int().positive().optional(),
      customEmailBody: z.string().optional(),
      customEmailSubject: z.string().optional(),
      variables: z.record(z.string(), z.any()),
      locale: z.string().default("vi"),
    }),
  )
  .query(async ({ input }) => {
    const svc = getNotificationService();
    return svc.previewTemplate(input);
  });

export const testDispatch = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      templateId: z.number().int().positive(),
      variables: z.record(z.string(), z.any()),
      emailRecipient: z.string().email(),
      locale: z.string().default("vi"),
    }),
  )
  .mutation(async ({ input }) => {
    const templateSvc = getNotificationTemplateService();
    const template = await templateSvc.getTemplateById(input.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const svc = getNotificationService();
    return svc.notify({
      type: template.type,
      titleKey: "Test Template",
      messageKey: "Test template body",
      variables: input.variables,
      emailRecipient: input.emailRecipient,
      deliveryClass: "TRANSACTIONAL",
    });
  });

export const listBlacklist = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_READ))
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getNotificationService();
    return svc.listBlacklist(input);
  });

export const addToBlacklist = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      email: z.string().email(),
      reason: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationService();
    return svc.addToBlacklist(input.email, input.reason);
  });
export const addToBlacklistBulk = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      entries: z.array(
        z.object({
          email: z.string().email(),
          reason: z.string().min(1),
        }),
      ),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationService();
    return svc.addToBlacklistBulk(input.entries);
  });
export const removeFromBlacklist = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      email: z.string().email(),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationService();
    return svc.removeFromBlacklist(input.email);
  });

export const removeFromBlacklistBulk = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      emails: z.array(z.string().email()),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationService();
    return svc.removeFromBlacklistBulk(input.emails);
  });

export const updateBlacklistReason = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      email: z.string().email(),
      reason: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationService();
    return svc.updateBlacklistReason(input.email, input.reason);
  });

export const syncCacheBulk = authedProcedure
  .use(requirePermission(Permissions.NOTIFICATIONS_SETTINGS_UPDATE))
  .input(
    z.object({
      emails: z.array(z.string().email()),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getNotificationService();
    return svc.syncCacheBulk(input.emails);
  });
