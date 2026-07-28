import {
  getDeviceTokenService,
  getNotificationService,
  getNotificationSettingService,
} from "@ecom/features/di/containers/NotificationService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listNotifications = authedProcedure
  .input(
    z
      .object({
        page: z.number().int().positive().optional(),
        perPage: z.number().int().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
        cursor: z.number().int().positive().optional(),
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
      isCustomer: true,
    });
  });

export const unreadCount = authedProcedure.query(async ({ ctx }) => {
  const svc = getNotificationService();
  return svc.getUnreadCount(ctx.user.id, true);
});

export const markRead = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.markRead(input.id, ctx.user.id, true);
  });

export const markAllRead = authedProcedure.mutation(async ({ ctx }) => {
  const svc = getNotificationService();
  return svc.markAllRead(ctx.user.id, true);
});

export const deleteNotification = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.deleteNotification(input.id, ctx.user.id, true);
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
      customerId: ctx.user.id,
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

export const getPreferences = authedProcedure.query(async ({ ctx }) => {
  const svc = getNotificationSettingService();
  return svc.getPreferences({ customerId: ctx.user.id });
});

export const updatePreference = authedProcedure
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
    return svc.updatePreference({ customerId: ctx.user.id }, input.eventType, {
      inApp: input.channels.inApp,
      push: input.channels.push,
      email: input.channels.email,
      webhook: input.channels.webhook,
      dndConfig: input.dndConfig,
    });
  });
