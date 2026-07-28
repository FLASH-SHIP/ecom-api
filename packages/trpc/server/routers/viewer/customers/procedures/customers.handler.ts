import { USERNAME_REGEX, USERNAME_VALIDATION_MESSAGE } from "@ecom/features/customer/constants";
import { getAuditService } from "@ecom/features/di/containers/AuditService";
import { getCustomerService } from "@ecom/features/di/containers/CustomerService";
import { hashPassword } from "@flash-ship/ecom-lib/crypto";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const customerStatusEnum = z.enum(["ACTIVE", "INACTIVE", "BANNED"]);
const usernameSchema = z.string().regex(USERNAME_REGEX, USERNAME_VALIDATION_MESSAGE).optional();

export const list = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .input(
    z.object({
      status: customerStatusEnum.optional(),
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(500).default(50),
      groupId: z.number().int().positive().optional(),
      rateCardId: z.number().int().positive().optional(),
    }),
  )
  .query(async ({ input }) => {
    const service = getCustomerService();
    return service.listCustomers(
      {
        status: input.status,
        search: input.search,
        groupId: input.groupId,
        rateCardId: input.rateCardId,
      },
      input.page,
      input.perPage,
    );
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .input(z.object({ id: z.string().min(1) }))
  .query(async ({ input }) => {
    const service = getCustomerService();
    return service.getCustomer(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_CREATE))
  .use(auditLog({ module: "customers", action: "CREATE", entityType: "Customer" }))
  .input(
    z.object({
      email: z.string().email(),
      username: usernameSchema,
      name: z.string().max(200).optional(),
      phone: z.string().max(20).optional(),
      dob: z
        .string()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
      gender: z.enum(["male", "female", "other"]).optional(),
      description: z.string().max(1000).optional(),
      password: z.string().min(8).max(100).optional(),
      groupId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { password, ...rest } = input;
    const service = getCustomerService();
    let hashedPwd: string | undefined;
    if (password) {
      hashedPwd = await hashPassword(password);
    }
    return service.createCustomer({ ...rest, hashedPassword: hashedPwd });
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .use(auditLog({ module: "customers", action: "UPDATE", entityType: "Customer" }))
  .input(
    z.object({
      id: z.string().min(1),
      username: usernameSchema,
      name: z.string().max(200).optional(),
      phone: z.string().max(20).optional(),
      avatarUrl: z.string().optional(),
      dob: z
        .string()
        .nullable()
        .optional()
        .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
      gender: z.enum(["male", "female", "other"]).nullable().optional(),
      description: z.string().max(1000).nullable().optional(),
      status: customerStatusEnum.optional(),
      groupId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getCustomerService();
    return service.updateCustomer(id, data, { bypassUsernameLimit: true });
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_DELETE))
  .use(auditLog({ module: "customers", action: "DELETE", entityType: "Customer" }))
  .input(z.object({ id: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const service = getCustomerService();
    return service.deleteCustomer(input.id);
  });

export const stats = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .query(async () => {
    const service = getCustomerService();
    return service.getStats();
  });

export const checkUsername = authedProcedure
  .input(z.object({ username: z.string().min(3).max(30) }))
  .query(async ({ input }) => {
    const service = getCustomerService();
    const available = await service.checkUsernameAvailability(input.username);
    return { available };
  });

export const verifyEmail = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .use(auditLog({ module: "customers", action: "VERIFY_EMAIL", entityType: "Customer" }))
  .input(z.object({ id: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const service = getCustomerService();
    return service.verifyCustomerEmail(input.id);
  });

export const setPassword = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .use(auditLog({ module: "customers", action: "SET_PASSWORD", entityType: "Customer" }))
  .input(z.object({ id: z.string().min(1), password: z.string().min(8).max(100) }))
  .mutation(async ({ input }) => {
    const service = getCustomerService();
    return service.setCustomerPassword(input.id, input.password);
  });

export const auditHistory = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .input(z.object({ id: z.string().min(1) }))
  .query(async ({ input }) => {
    const service = getAuditService();
    return service.getAuditLogs({
      where: {
        entityType: "Customer",
        entityId: String(input.id),
      },
    });
  });

export const verificationCodesList = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .input(
    z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(500).default(25),
    }),
  )
  .query(async ({ input }) => {
    const service = getCustomerService();
    return service.listVerificationCodes(input.search, input.page, input.perPage);
  });
