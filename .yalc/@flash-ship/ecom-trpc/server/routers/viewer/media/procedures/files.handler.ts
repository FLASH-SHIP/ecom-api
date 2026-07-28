import { getMediaFileService } from "@ecom/features/di/containers/MediaService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.MEDIA_READ))
  .input(
    z
      .object({
        folderId: z.number().int().nullable().optional(),
        mimeType: z.string().max(50).optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(30),
        sortBy: z.enum(["createdAt", "name", "size"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const service = getMediaFileService();
    return service.listFiles(input ?? undefined);
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.MEDIA_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const service = getMediaFileService();
    return service.getFile(input.id);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.MEDIA_UPDATE))
  .use(auditLog({ module: "media", action: "UPDATE", entityType: "MediaFile" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      alt: z.string().max(500).optional(),
      description: z.string().max(2000).optional(),
      folderId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getMediaFileService();
    return service.updateFile(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.MEDIA_DELETE))
  .use(auditLog({ module: "media", action: "DELETE", entityType: "MediaFile" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const service = getMediaFileService();
    return service.deleteFile(input.id);
  });

export const move = authedProcedure
  .use(requirePermission(Permissions.MEDIA_UPDATE))
  .use(auditLog({ module: "media", action: "MOVE", entityType: "MediaFile" }))
  .input(
    z.object({
      ids: z.array(z.number().int().positive()).min(1),
      folderId: z.number().int().positive().nullable(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getMediaFileService();
    return service.moveFiles(input.ids, input.folderId);
  });

export const removeMany = authedProcedure
  .use(requirePermission(Permissions.MEDIA_DELETE))
  .use(auditLog({ module: "media", action: "BULK_DELETE", entityType: "MediaFile" }))
  .input(
    z.object({
      ids: z.array(z.number().int().positive()).min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getMediaFileService();
    return service.deleteFiles(input.ids);
  });

export const stats = authedProcedure
  .use(requirePermission(Permissions.MEDIA_READ))
  .query(async () => {
    const service = getMediaFileService();
    return service.getStats();
  });
