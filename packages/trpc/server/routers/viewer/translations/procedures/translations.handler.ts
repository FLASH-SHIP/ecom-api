import { getTranslationService } from "@ecom/features/di/containers/TranslationService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const entityTypeEnum = z.enum(["post", "category", "page", "tag", "menuItem"]);

export const languages = authedProcedure.query(async () => {
  const svc = getTranslationService();
  return svc.getLanguages();
});

export const getTranslation = authedProcedure
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
      langCode: z.string().min(2).max(10),
    }),
  )
  .query(async ({ input }) => {
    const svc = getTranslationService();
    return svc.getTranslation(input.entityType, input.entityId, input.langCode);
  });

export const listTranslations = authedProcedure
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getTranslationService();
    return svc.listTranslations(input.entityType, input.entityId);
  });

export const saveTranslation = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
      langCode: z.string().min(2).max(10),
      data: z.record(z.string(), z.string().optional()),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getTranslationService();
    return svc.saveTranslation(input.entityType, input.entityId, input.langCode, input.data);
  });

export const deleteTranslation = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
      langCode: z.string().min(2).max(10),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getTranslationService();
    return svc.deleteTranslation(input.entityType, input.entityId, input.langCode);
  });

export const translationStatus = authedProcedure
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getTranslationService();
    return svc.getTranslationStatus(input.entityType, input.entityId);
  });

/**
 * Batch translation status — accepts multiple entity IDs in a single request.
 * Returns a map of entityId → langCode[] to avoid N+1 queries.
 */
export const batchTranslationStatus = authedProcedure
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityIds: z.array(z.number().int().positive()).max(100),
    }),
  )
  .query(async ({ input }) => {
    const svc = getTranslationService();
    return svc.getBatchTranslationStatus(input.entityType, input.entityIds);
  });
