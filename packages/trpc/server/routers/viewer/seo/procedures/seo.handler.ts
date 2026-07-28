import { getSeoMetaService } from "@ecom/features/di/containers/SeoService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const entityTypeEnum = z.enum(["post", "category", "page", "tag"]);

const seoDataSchema = z.object({
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  seoImage: z.string().max(500).optional(),
  indexMode: z.enum(["index", "noindex"]).optional(),
});

export const getSeoMeta = authedProcedure
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getSeoMetaService();
    switch (input.entityType) {
      case "post":
        return svc.getForPost(input.entityId);
      case "category":
        return svc.getForCategory(input.entityId);
      case "page":
        return svc.getForPage(input.entityId);
      case "tag":
        return svc.getForTag(input.entityId);
    }
  });

export const saveSeoMeta = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .input(
    z.object({
      entityType: entityTypeEnum,
      entityId: z.number().int().positive(),
      data: seoDataSchema,
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getSeoMetaService();
    switch (input.entityType) {
      case "post":
        return svc.saveForPost(input.entityId, input.data);
      case "category":
        return svc.saveForCategory(input.entityId, input.data);
      case "page":
        return svc.saveForPage(input.entityId, input.data);
      case "tag":
        return svc.saveForTag(input.entityId, input.data);
    }
  });
