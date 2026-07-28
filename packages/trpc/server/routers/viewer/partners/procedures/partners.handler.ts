import { getPartnerService } from "@ecom/features/di/containers/PartnerContainer";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { PartnerStatus, Prisma, prisma, ServiceType } from "@ecom/prisma";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const partnerStatusSchema = z.nativeEnum(PartnerStatus);
const serviceTypeSchema = z.nativeEnum(ServiceType);

const SENSITIVE_KEYS = new Set([
  "apikey",
  "secretkey",
  "clientsecret",
  "password",
  "token",
  "webhooksecret",
  "privatekey",
]);

// Helper to recursively mask secrets in configurations for UI responses and Audit Logs
function maskSensitiveValues(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveValues(item));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) && typeof value === "string") {
      result[key] = "******";
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskSensitiveValues(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Helper to log changes to global AuditLog table securely
async function writeSecureAuditLog(params: {
  userId: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityId: string;
  entityType: string;
  oldValues?: unknown;
  newValues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: "partners",
        entityId: params.entityId,
        entityType: params.entityType,
        oldValues: params.oldValues
          ? (maskSensitiveValues(params.oldValues) as Prisma.InputJsonValue)
          : Prisma.DbNull,
        newValues: params.newValues
          ? (maskSensitiveValues(params.newValues) as Prisma.InputJsonValue)
          : Prisma.DbNull,
        ipAddress: params.ip || null,
        userAgent: params.userAgent || null,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (err) {
    console.error("Failed to write secure audit log for partners:", err);
  }
}

// 1. List Partners (authed)
export const list = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_READ))
  .input(
    z
      .object({
        search: z.string().optional(),
        status: partnerStatusSchema.optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(20),
        sortBy: z
          .enum(["id", "code", "name", "status", "createdAt", "updatedAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const partnerService = getPartnerService();
    return await partnerService.listPartners(input ?? {});
  });

// 2. Get Partner (authed)
export const get = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const partnerService = getPartnerService();
    try {
      const partner = await partnerService.getPartner(input.id, true);
      return {
        ...partner,
        apiConfig: partner.apiConfig
          ? (maskSensitiveValues(partner.apiConfig) as Record<string, unknown>)
          : null,
      };
    } catch (error) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: error instanceof Error ? error.message : "Đối tác không tồn tại.",
      });
    }
  });

// 3. Create Partner (authed)
export const create = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_CREATE))
  .input(
    z.object({
      code: z.string().min(2).max(50),
      name: z.string().min(2).max(100),
      contactName: z.string().optional().nullable(),
      contactEmail: z.string().email().optional().nullable().or(z.literal("")),
      contactPhone: z.string().optional().nullable(),
      status: partnerStatusSchema.default(PartnerStatus.ACTIVE),
      description: z.string().optional().nullable(),
      apiConfig: z.record(z.string(), z.unknown()).optional().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const partnerService = getPartnerService();
    try {
      const email = input.contactEmail === "" ? null : input.contactEmail;
      const created = await partnerService.createPartner({
        ...input,
        apiConfig: input.apiConfig as Prisma.InputJsonValue | null,
        contactEmail: email,
      });

      await writeSecureAuditLog({
        userId: ctx.user?.id || null,
        action: "CREATE",
        entityId: String(created.id),
        entityType: "Partner",
        newValues: input,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return created;
    } catch (error) {
      throw new TRPCError({
        code: "CONFLICT",
        message: error instanceof Error ? error.message : "Không thể tạo đối tác.",
      });
    }
  });

// 4. Update Partner (authed)
export const update = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_UPDATE))
  .input(
    z.object({
      id: z.number().int().positive(),
      code: z.string().min(2).max(50).optional(),
      name: z.string().min(2).max(100).optional(),
      contactName: z.string().optional().nullable(),
      contactEmail: z.string().email().optional().nullable().or(z.literal("")),
      contactPhone: z.string().optional().nullable(),
      status: partnerStatusSchema.optional(),
      description: z.string().optional().nullable(),
      apiConfig: z.record(z.string(), z.unknown()).optional().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const partnerService = getPartnerService();
    try {
      const original = await partnerService.getPartner(id);
      const email = data.contactEmail === "" ? null : data.contactEmail;
      const updated = await partnerService.updatePartner(id, {
        ...data,
        apiConfig: data.apiConfig as Prisma.InputJsonValue | null,
        contactEmail: email,
      });

      await writeSecureAuditLog({
        userId: ctx.user?.id || null,
        action: "UPDATE",
        entityId: String(id),
        entityType: "Partner",
        oldValues: original,
        newValues: updated,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return updated;
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Không thể cập nhật đối tác.",
      });
    }
  });

// 5. Delete Partner (authed)
export const remove = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_DELETE))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const partnerService = getPartnerService();
    try {
      const original = await partnerService.getPartner(input.id);
      const result = await partnerService.deletePartner(input.id);

      await writeSecureAuditLog({
        userId: ctx.user?.id || null,
        action: "DELETE",
        entityId: String(input.id),
        entityType: "Partner",
        oldValues: original,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return result;
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Không thể xóa đối tác.",
      });
    }
  });

// 6. List Services of a Partner (authed)
export const listServices = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_READ))
  .input(z.object({ partnerId: z.number().int().positive() }))
  .query(async ({ input }) => {
    const partnerService = getPartnerService();
    const services = await partnerService.listServices(input.partnerId);
    return services;
  });

// 7. Add Partner Service (authed)
export const addService = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_UPDATE))
  .input(
    z.object({
      partnerId: z.number().int().positive(),
      code: z.string().min(2).max(50),
      name: z.string().min(2).max(100),
      type: serviceTypeSchema,
      statusMapping: z.record(z.string(), z.unknown()).optional().nullable(),
      isActive: z.boolean().default(true),
      webhookSecret: z.string().optional().nullable(),
      timeoutMs: z.number().int().positive().default(10000),
      rateLimitPerMinute: z.number().int().positive().default(60),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const partnerService = getPartnerService();
    try {
      const created = await partnerService.addService({
        ...input,
        statusMapping: input.statusMapping as Prisma.InputJsonValue | null,
      });

      await writeSecureAuditLog({
        userId: ctx.user?.id || null,
        action: "UPDATE",
        entityId: String(input.partnerId),
        entityType: "Partner",
        metadata: { subAction: "ADD_SERVICE", serviceCode: input.code },
        newValues: input,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return created;
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Không thể thêm dịch vụ.",
      });
    }
  });

// 8. Update Partner Service (authed)
export const updateService = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_UPDATE))
  .input(
    z.object({
      id: z.coerce.number(),
      code: z.string().min(2).max(50).optional(),
      name: z.string().min(2).max(100).optional(),
      type: serviceTypeSchema.optional(),
      statusMapping: z.record(z.string(), z.unknown()).optional().nullable(),
      isActive: z.boolean().optional(),
      webhookSecret: z.string().optional().nullable(),
      timeoutMs: z.number().int().positive().optional(),
      rateLimitPerMinute: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const partnerService = getPartnerService();
    try {
      const original = await partnerService.getService(id);
      const updated = await partnerService.updateService(id, {
        ...data,
        statusMapping: data.statusMapping as Prisma.InputJsonValue | null,
      });

      await writeSecureAuditLog({
        userId: ctx.user?.id || null,
        action: "UPDATE",
        entityId: String(original.partnerId),
        entityType: "Partner",
        metadata: { subAction: "UPDATE_SERVICE", serviceId: id },
        oldValues: original,
        newValues: updated,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return updated;
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Không thể cập nhật dịch vụ.",
      });
    }
  });

// 9. Delete Partner Service (authed)
export const deleteService = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_UPDATE))
  .input(z.object({ id: z.coerce.number() }))
  .mutation(async ({ ctx, input }) => {
    const partnerService = getPartnerService();
    try {
      const original = await partnerService.getService(input.id);
      const result = await partnerService.deleteService(input.id);

      await writeSecureAuditLog({
        userId: ctx.user?.id || null,
        action: "UPDATE",
        entityId: String(original.partnerId),
        entityType: "Partner",
        metadata: { subAction: "DELETE_SERVICE", serviceId: input.id },
        oldValues: original,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return result;
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Không thể xóa dịch vụ.",
      });
    }
  });

// 10. Test Connection to Partner (authed)
export const testConnection = authedProcedure
  .use(requirePermission(Permissions.PARTNERS_UPDATE))
  .input(
    z.object({
      id: z.number().int().positive(),
      tempConfig: z.record(z.string(), z.unknown()).optional().nullable(),
    }),
  )
  .mutation(async ({ input }) => {
    const partnerService = getPartnerService();
    try {
      return await partnerService.testConnection(
        input.id,
        (input.tempConfig as Record<string, unknown>) ?? undefined,
      );
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Lỗi kiểm tra kết nối.",
      });
    }
  });
