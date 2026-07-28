import { contentLockService } from "@ecom/features/content-lock/ContentLockService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const entityTypeSchema = z.enum(["post", "page"]);

export const acquireLock = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .input(
    z.object({
      entityType: entityTypeSchema,
      entityId: z.number().int().positive(),
    }),
  )
  .mutation(({ ctx, input }) => {
    return contentLockService.acquire(
      input.entityType,
      input.entityId,
      ctx.user.id,
      ctx.user.name ?? ctx.user.email,
    );
  });

export const releaseLock = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .input(
    z.object({
      entityType: entityTypeSchema,
      entityId: z.number().int().positive(),
    }),
  )
  .mutation(({ ctx, input }) => {
    return contentLockService.release(input.entityType, input.entityId, ctx.user.id);
  });

export const checkLock = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z.object({
      entityType: entityTypeSchema,
      entityId: z.number().int().positive(),
    }),
  )
  .query(({ input }) => {
    return contentLockService.check(input.entityType, input.entityId);
  });

export const heartbeat = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .input(
    z.object({
      entityType: entityTypeSchema,
      entityId: z.number().int().positive(),
    }),
  )
  .mutation(({ ctx, input }) => {
    return contentLockService.heartbeat(input.entityType, input.entityId, ctx.user.id);
  });
