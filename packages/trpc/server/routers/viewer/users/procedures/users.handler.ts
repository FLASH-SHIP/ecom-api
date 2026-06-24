import { getUserManagementService } from "@ecom/features/di/containers/RbacService";
import { UserTransformer } from "@ecom/features/rbac/transformers/UserTransformer";
import { Permissions } from "@ecom/lib/permissions";
import { UserStatus } from "@ecom/prisma";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { z } from "zod";

const userStatusSchema = z.nativeEnum(UserStatus);

export const list = authedProcedure
  .use(requirePermission(Permissions.USERS_READ))
  .input(
    z
      .object({
        search: z.string().max(200).optional(),
        status: userStatusSchema.optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(20),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const userService = getUserManagementService();
    const result = await userService.listUsers(input ?? {});
    return new UserTransformer().transformPaginated(result);
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.USERS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const userService = getUserManagementService();
    const result = await userService.getUser(input.id);
    return new UserTransformer().transformItem(result!);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.USERS_CREATE))
  .use(auditLog({ module: "users", action: "CREATE", entityType: "User" }))
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().max(100).optional(),
      username: z.string().max(50).optional(),
      password: z.string().min(8).max(100),
      locale: z.string().max(10).optional(),
      roleIds: z.array(z.string()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const userService = getUserManagementService();
    const result = await userService.createUser(input);
    return new UserTransformer().transformItem(result!);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.USERS_UPDATE))
  .use(auditLog({ module: "users", action: "UPDATE", entityType: "User" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().max(100).optional(),
      username: z.string().max(50).optional(),
      avatarUrl: z.string().url().optional(),
      locale: z.string().max(10).optional(),
      status: userStatusSchema.optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const userService = getUserManagementService();
    const result = await userService.updateUser(id, data);
    return new UserTransformer().transformItem(result!);
  });

export const changePassword = authedProcedure
  .use(requirePermission(Permissions.USERS_UPDATE))
  .use(auditLog({ module: "users", action: "CHANGE_PASSWORD", entityType: "User" }))
  .input(
    z.object({
      userId: z.number().int().positive(),
      newPassword: z.string().min(8).max(100),
    }),
  )
  .mutation(async ({ input }) => {
    const userService = getUserManagementService();
    await userService.changePassword(input.userId, input.newPassword);
    return { success: true };
  });

export const syncRoles = authedProcedure
  .use(requirePermission(Permissions.USERS_UPDATE))
  .use(auditLog({ module: "users", action: "SYNC_ROLES", entityType: "User" }))
  .input(
    z.object({
      userId: z.number().int().positive(),
      roleIds: z.array(z.string()),
    }),
  )
  .mutation(async ({ input }) => {
    const userService = getUserManagementService();
    const result = await userService.syncRoles(input.userId, input.roleIds);
    return new UserTransformer().transformItem(result!);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.USERS_DELETE))
  .use(auditLog({ module: "users", action: "DELETE", entityType: "User" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const userService = getUserManagementService();
    const result = await userService.deleteUser(input.id, ctx.user.id);
    return new UserTransformer().transformItem(result!);
  });
