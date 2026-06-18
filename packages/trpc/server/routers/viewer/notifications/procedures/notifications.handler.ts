import { getNotificationService } from "@ecom/features/di/containers/NotificationService";
import { authedProcedure } from "@ecom/trpc/server/trpc";
import { z } from "zod";

export const listNotifications = authedProcedure
  .input(
    z
      .object({
        page: z.number().int().positive().default(1),
        perPage: z.number().int().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.listNotifications(ctx.user.id, input ?? {});
  });

export const unreadCount = authedProcedure.query(async ({ ctx }) => {
  const svc = getNotificationService();
  return svc.getUnreadCount(ctx.user.id);
});

export const markRead = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.markRead(input.id, ctx.user.id);
  });

export const markAllRead = authedProcedure.mutation(async ({ ctx }) => {
  const svc = getNotificationService();
  return svc.markAllRead(ctx.user.id);
});

export const deleteNotification = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const svc = getNotificationService();
    return svc.deleteNotification(input.id, ctx.user.id);
  });
