import { getMediaFolderService } from "@ecom/features/di/containers/MediaService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.MEDIA_READ))
  .input(
    z
      .object({
        parentId: z.number().int().nullable().optional(),
        search: z.string().max(200).optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const service = getMediaFolderService();
    return service.listFolders(input ?? undefined);
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.MEDIA_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const service = getMediaFolderService();
    return service.getFolder(input.id);
  });

export const tree = authedProcedure
  .use(requirePermission(Permissions.MEDIA_READ))
  .query(async () => {
    const service = getMediaFolderService();
    return service.getFolderTree();
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.MEDIA_UPLOAD))
  .use(auditLog({ module: "media", action: "CREATE", entityType: "MediaFolder" }))
  .input(
    z.object({
      name: z.string().min(1).max(100),
      slug: z.string().max(100).optional(),
      parentId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getMediaFolderService();
    return service.createFolder(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.MEDIA_UPDATE))
  .use(auditLog({ module: "media", action: "UPDATE", entityType: "MediaFolder" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(100).optional(),
      slug: z.string().max(100).optional(),
      parentId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getMediaFolderService();
    return service.updateFolder(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.MEDIA_DELETE))
  .use(auditLog({ module: "media", action: "DELETE", entityType: "MediaFolder" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      force: z.boolean().default(false),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getMediaFolderService();
    return service.deleteFolder(input.id, input.force);
  });
