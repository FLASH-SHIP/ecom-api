import { getAuditService } from "@ecom/features/di/containers/AuditService";
import type { FilterFieldConfigMap } from "@ecom/features/shared/utils/buildPrismaWhere";
import { buildPrismaWhere } from "@ecom/features/shared/utils/buildPrismaWhere";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { filtersInputSchema } from "@flash-ship/ecom-trpc/server/shared/filterSchema";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const AUDIT_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  userId: { prismaField: "userId", type: "number" },
  action: { prismaField: "action", type: "string" },
  module: { prismaField: "module", type: "string" },
  entityType: { prismaField: "entityType", type: "string" },
  entityId: { prismaField: "entityId", type: "string" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

const filtersSchema = z.object({
  filters: filtersInputSchema,
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).optional(),
  sortBy: z.enum(["id", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const listAuditLogs = authedProcedure
  .use(requirePermission(Permissions.AUDIT_LOGS_READ))
  .input(filtersSchema)
  .query(async ({ input }) => {
    const service = getAuditService();
    const { page, pageSize, sortBy, sortDir, filters } = input;
    const prismaWhere = buildPrismaWhere(filters, AUDIT_FILTER_FIELDS);
    const resolvedPerPage = pageSize ?? 25;
    return service.getAuditLogs(
      {
        where: prismaWhere,
        sortBy,
        sortDir,
      },
      page,
      resolvedPerPage,
    );
  });

export const getAuditLog = authedProcedure
  .use(requirePermission(Permissions.AUDIT_LOGS_READ))
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    const service = getAuditService();
    return service.getAuditLog(input.id);
  });

export const getAuditStats = authedProcedure
  .use(requirePermission(Permissions.AUDIT_LOGS_READ))
  .query(async () => {
    const service = getAuditService();
    return service.getAuditStats();
  });

export const deleteAuditLog = authedProcedure
  .use(requirePermission(Permissions.AUDIT_LOGS_PURGE))
  .use(auditLog({ module: "audit-logs", action: "DELETE", entityType: "AuditLog" }))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    const service = getAuditService();
    return service.deleteAuditLog(input.id);
  });

export const purgeAllAuditLogs = authedProcedure
  .use(requirePermission(Permissions.AUDIT_LOGS_PURGE))
  .use(auditLog({ module: "audit-logs", action: "PURGE", entityType: "AuditLog" }))
  .mutation(async () => {
    const service = getAuditService();
    return service.purgeAllAuditLogs();
  });

export const purgeAuditLogs = authedProcedure
  .use(requirePermission(Permissions.AUDIT_LOGS_PURGE))
  .use(auditLog({ module: "audit-logs", action: "PURGE", entityType: "AuditLog" }))
  .input(z.object({ olderThanDays: z.number().int().min(1).max(365) }))
  .mutation(async ({ input }) => {
    const service = getAuditService();
    return service.purgeAuditLogs(input.olderThanDays);
  });
