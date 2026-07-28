import { getWebhookService } from "@ecom/features/di/containers/WebhookService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listWebhooks = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_READ))
  .query(async () => {
    const svc = getWebhookService();
    return svc.listWebhooks();
  });

export const getWebhook = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const svc = getWebhookService();
    return svc.getWebhook(input.id);
  });

export const availableEvents = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_READ))
  .query(async () => {
    const svc = getWebhookService();
    return svc.getAvailableEvents();
  });

export const createWebhook = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_CREATE))
  .use(auditLog({ module: "webhooks", action: "CREATE", entityType: "Webhook" }))
  .input(
    z.object({
      name: z.string().min(1).max(100),
      url: z.string().url(),
      secret: z.string().max(256).optional(),
      events: z.array(z.string()).min(1),
      retries: z.number().int().min(0).max(10).optional(),
      timeout: z.number().int().min(5).max(120).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getWebhookService();
    return svc.createWebhook(input);
  });

export const updateWebhook = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_UPDATE))
  .use(auditLog({ module: "webhooks", action: "UPDATE", entityType: "Webhook" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(100).optional(),
      url: z.string().url().optional(),
      secret: z.string().max(256).optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
      retries: z.number().int().min(0).max(10).optional(),
      timeout: z.number().int().min(5).max(120).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const svc = getWebhookService();
    return svc.updateWebhook(id, data);
  });

export const deleteWebhook = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_DELETE))
  .use(auditLog({ module: "webhooks", action: "DELETE", entityType: "Webhook" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getWebhookService();
    return svc.deleteWebhook(input.id);
  });

export const getWebhookLogs = authedProcedure
  .use(requirePermission(Permissions.WEBHOOKS_READ))
  .input(z.object({ webhookId: z.number().int().positive() }))
  .query(async ({ input }) => {
    const svc = getWebhookService();
    return svc.getWebhookLogs(input.webhookId);
  });
