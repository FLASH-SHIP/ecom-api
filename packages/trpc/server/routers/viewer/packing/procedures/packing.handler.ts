import { getPackingService } from "@ecom/features/di/containers/PackingService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { ContentStatus } from "@ecom/prisma";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(
    z.object({
      search: z.string().optional(),
      status: z.nativeEnum(ContentStatus).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      orderBy: z.enum(["asc", "desc"]).optional(),
    }),
  )
  .query(async ({ input }) => {
    return getPackingService().listPackingTypes(input);
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    return getPackingService().getPackingType(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "CREATE", entityType: "PackingType" }))
  .input(
    z.object({
      name: z.string().min(2).max(100),
      image: z.string().max(500).optional().nullable(),
      description: z.string().max(1000).optional().nullable(),
      status: z.nativeEnum(ContentStatus).default(ContentStatus.DRAFT),
    }),
  )
  .mutation(async ({ input }) => {
    return getPackingService().createPackingType(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "UPDATE", entityType: "PackingType" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).max(100).optional(),
      image: z.string().max(500).optional().nullable(),
      description: z.string().max(1000).optional().nullable(),
      status: z.nativeEnum(ContentStatus).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return getPackingService().updatePackingType(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "DELETE", entityType: "PackingType" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    return getPackingService().deletePackingType(input.id);
  });
