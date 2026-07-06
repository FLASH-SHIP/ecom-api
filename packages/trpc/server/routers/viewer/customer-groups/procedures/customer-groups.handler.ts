import { getCustomerGroupService } from "@ecom/features/di/containers/CustomerService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.CUSTOMER_GROUPS_READ))
  .input(
    z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(500).default(50),
      sortBy: z.string().optional(),
      sortDir: z.enum(["asc", "desc"]).optional(),
    }),
  )
  .query(async ({ input }) => {
    const service = getCustomerGroupService();
    return service.listCustomerGroups(
      {
        search: input.search,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
      },
      input.page,
      input.perPage,
    );
  });

export const listAll = authedProcedure
  .use(requirePermission(Permissions.CUSTOMER_GROUPS_READ))
  .query(async () => {
    const service = getCustomerGroupService();
    return service.listAllCustomerGroups();
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.CUSTOMER_GROUPS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const service = getCustomerGroupService();
    try {
      return await service.getCustomerGroup(input.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nhóm khách hàng không tồn tại.";
      throw new TRPCError({
        code: "NOT_FOUND",
        message,
      });
    }
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.CUSTOMER_GROUPS_CREATE))
  .use(auditLog({ module: "customerGroups", action: "CREATE", entityType: "CustomerGroup" }))
  .input(
    z.object({
      code: z.string().min(2).max(50),
      name: z.string().min(2).max(100),
      description: z.string().max(500).optional().nullable(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getCustomerGroupService();
    try {
      return await service.createCustomerGroup(input);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể tạo nhóm khách hàng.";
      throw new TRPCError({
        code: "CONFLICT",
        message,
      });
    }
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.CUSTOMER_GROUPS_UPDATE))
  .use(auditLog({ module: "customerGroups", action: "UPDATE", entityType: "CustomerGroup" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      code: z.string().min(2).max(50).optional(),
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional().nullable(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getCustomerGroupService();
    try {
      return await service.updateCustomerGroup(id, data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Không thể cập nhật nhóm khách hàng.";
      throw new TRPCError({
        code: "CONFLICT",
        message,
      });
    }
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.CUSTOMER_GROUPS_DELETE))
  .use(auditLog({ module: "customerGroups", action: "DELETE", entityType: "CustomerGroup" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const service = getCustomerGroupService();
    try {
      return await service.deleteCustomerGroup(input.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể xóa nhóm khách hàng.";
      throw new TRPCError({
        code: "CONFLICT",
        message,
      });
    }
  });
