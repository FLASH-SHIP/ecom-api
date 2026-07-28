import { randomUUID } from "node:crypto";
import { getWebhookService } from "@ecom/features/di/containers/WebhookService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const list = authedProcedure.query(async ({ ctx }) => {
  const service = getWebhookService();
  return await service.listWebhooks({
    ownerId: ctx.user.id,
    ownerType: "Customer",
  });
});

export const create = authedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100),
      url: z.string().url("Webhook URL phải hợp lệ"),
      events: z.array(z.string()).min(1, "Chọn ít nhất 1 sự kiện để theo dõi"),
      apiVersion: z.string().default("2026-07-16"),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getWebhookService();

    // Validate events
    const allowed = service.getAvailableEvents() as string[];
    for (const ev of input.events) {
      if (!allowed.includes(ev)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Sự kiện "${ev}" không hợp lệ.`,
        });
      }
    }

    const secret = `whsec_${randomUUID().replace(/-/g, "")}`;

    const webhook = await service.createWebhook({
      name: input.name,
      url: input.url,
      events: input.events,
      secret,
      ownerId: ctx.user.id,
      ownerType: "Customer",
      apiVersion: input.apiVersion,
    });

    return webhook;
  });

export const remove = authedProcedure
  .input(
    z.object({
      id: z.number().int(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getWebhookService();
    const webhook = await service.getWebhook(input.id).catch(() => null);

    if (!webhook || webhook.ownerId !== ctx.user.id || webhook.ownerType !== "Customer") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Không tìm thấy webhook hoặc không có quyền sở hữu.",
      });
    }

    await service.deleteWebhook(input.id);
    return { success: true };
  });

export const rollSecret = authedProcedure
  .input(
    z.object({
      id: z.number().int(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getWebhookService();
    const webhook = await service.getWebhook(input.id).catch(() => null);

    if (!webhook || webhook.ownerId !== ctx.user.id || webhook.ownerType !== "Customer") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Không tìm thấy webhook hoặc không có quyền sở hữu.",
      });
    }

    const newSecret = await service.rotateWebhookSecret(input.id);
    return { secret: newSecret };
  });

export const testWebhook = authedProcedure
  .input(
    z.object({
      id: z.number().int(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getWebhookService();
    const webhook = await service.getWebhook(input.id).catch(() => null);

    if (!webhook || webhook.ownerId !== ctx.user.id || webhook.ownerType !== "Customer") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Không tìm thấy webhook hoặc không có quyền sở hữu.",
      });
    }

    // Trigger simulated ping event
    await service.dispatch(
      "ping",
      {},
      {
        ownerId: ctx.user.id,
        ownerType: "Customer",
      },
    );

    return { success: true };
  });

export const listLogs = authedProcedure
  .input(
    z.object({
      webhookId: z.number().int(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const service = getWebhookService();
    const webhook = await service.getWebhook(input.webhookId).catch(() => null);

    if (!webhook || webhook.ownerId !== ctx.user.id || webhook.ownerType !== "Customer") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Không tìm thấy webhook hoặc không có quyền sở hữu.",
      });
    }

    return await service.getWebhookLogs(input.webhookId);
  });
