import {
  getRateCardRepository,
  getRateCardService,
} from "@ecom/features/di/containers/ShippingRateService";
import { Permissions } from "@ecom/lib/permissions";
import { ContentStatus, Prisma, prisma, RateCardType, ShippingMethod } from "@ecom/prisma";

const { Decimal } = Prisma;

import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { rateLimiters } from "@ecom/trpc/server/middleware/rateLimit";
import { authedProcedure, publicProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const contentStatusSchema = z.nativeEnum(ContentStatus);
const shippingMethodSchema = z.nativeEnum(ShippingMethod);
const rateCardTypeSchema = z.nativeEnum(RateCardType);

type RateCardRepo = ReturnType<typeof getRateCardRepository>;
type RateCardService = ReturnType<typeof getRateCardService>;

const DEFAULT_RATE_CARD_CODES = ["epacket.default.us", "express.default.us"];

async function checkDuplicateCode(
  rateRepo: RateCardRepo,
  code: string | undefined,
  currentCode?: string,
): Promise<void> {
  if (code && code !== currentCode) {
    const existing = await rateRepo.findByCode(code);
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Mã bảng giá cước "${code}" đã tồn tại.`,
      });
    }
  }
}

async function validateAndPublish(
  rateRepo: RateCardRepo,
  rateService: RateCardService,
  id: number,
  status: ContentStatus | undefined,
  currentStatus: ContentStatus,
): Promise<void> {
  if (status === "PUBLISHED" || (currentStatus === "PUBLISHED" && status !== "ARCHIVED")) {
    try {
      await rateService.validatePublishingConstraints(id);
    } catch (error) {
      if (status === "PUBLISHED") {
        await rateRepo.update(id, { status: "DRAFT" });
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: error instanceof Error ? error.message : "Trùng lặp thời gian hiệu lực.",
      });
    }
  }
}

const slabInputSchema = z.object({
  startWeight: z.number().nonnegative(),
  endWeight: z.number().positive(),
  rateType: rateCardTypeSchema,
  amount: z.number().nonnegative(),
});

// 1. Calculate freight (Public procedure)
export const calculate = publicProcedure
  .input(
    z.object({
      shippingMethod: shippingMethodSchema,
      country: z.string().min(2).max(10),
      weight: z.number().positive(),
      origin: z.string().min(2).max(10).optional().nullable(),
      customerId: z.number().int().positive(),
      calculationDate: z.coerce.date().optional(),
    }),
  )
  .query(async ({ input }) => {
    const rateService = getRateCardService();
    try {
      return await rateService.calculateFreight(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi tính toán cước phí.";
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code: unknown }).code
          : undefined;
      throw new TRPCError({
        code: code === "RATE_CARD_NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
        message,
      });
    }
  });

// 2. List rate cards (Admin authed)
export const list = authedProcedure
  .use(requirePermission(Permissions.RATES_READ))
  .input(
    z
      .object({
        id: z.number().int().positive().optional(),
        code: z.string().optional(),
        status: contentStatusSchema.optional(),
        shippingMethod: shippingMethodSchema.optional(),
        country: z.string().optional(),
        origin: z.string().optional(),
        search: z.string().optional(),
        name: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        customerGroupId: z.number().int().positive().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(20),
        sortBy: z
          .enum(["id", "code", "name", "status", "createdAt", "updatedAt", "startDate", "endDate"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const rateRepo = getRateCardRepository();
    return await rateRepo.findMany(input ?? {});
  });

// 3. Get single rate card details (Admin authed)
export const get = authedProcedure
  .use(requirePermission(Permissions.RATES_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const rateRepo = getRateCardRepository();
    const result = await rateRepo.findById(input.id);
    if (!result) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bảng giá cước không tồn tại." });
    }
    return result;
  });

// 4. Create rate card (Admin authed)
export const create = authedProcedure
  .use(rateLimiters.mutation)
  .use(requirePermission(Permissions.RATES_CREATE))
  .use(auditLog({ module: "rateCards", action: "CREATE", entityType: "RateCard" }))
  .input(
    z.object({
      code: z.string().min(3).max(100),
      name: z.string().min(3).max(200),
      status: contentStatusSchema.default("DRAFT"),
      shippingMethod: shippingMethodSchema,
      country: z.string().min(2).max(10).default("US"),
      origin: z.string().min(2).max(10).optional().nullable().default(null),
      currency: z.string().min(2).max(10).default("USD"),
      weightStep: z.number().positive(),
      minWeight: z.number().nonnegative(),
      maxWeight: z.number().positive(),
      startDate: z.coerce.date().nullable().optional(),
      endDate: z.coerce.date().nullable().optional(),
      customerGroupIds: z.array(z.number().int().positive()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const rateRepo = getRateCardRepository();
    const rateService = getRateCardService();

    // Check duplicate code
    const existing = await rateRepo.findByCode(input.code);
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Mã bảng giá cước "${input.code}" đã tồn tại.`,
      });
    }

    // If published, validate constraints
    if (input.status === "PUBLISHED") {
      // Overlap constraint requires card to exist first, but we can validate overlaps pre-emptively:
      const overlaps = await rateRepo.findOverlappingRateCards({
        shippingMethod: input.shippingMethod,
        country: input.country,
        origin: input.origin,
        customerGroupIds: input.customerGroupIds ?? [],
        startDate: input.startDate,
        endDate: input.endDate,
      });
      if (overlaps.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Chồng chéo thời gian hiệu lực với bảng giá đang hoạt động khác: ${overlaps.map((o) => o.code).join(", ")}.`,
        });
      }
    }

    const created = await rateRepo.create(input);

    // Invalidate caches
    await rateService.invalidateRateCardCache(created.id).catch(() => {});

    return created;
  });

// 5. Update rate card (Admin authed)
export const update = authedProcedure
  .use(requirePermission(Permissions.RATES_UPDATE))
  .use(auditLog({ module: "rateCards", action: "UPDATE", entityType: "RateCard" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      code: z.string().min(3).max(100).optional(),
      name: z.string().min(3).max(200).optional(),
      status: contentStatusSchema.optional(),
      shippingMethod: shippingMethodSchema.optional(),
      country: z.string().min(2).max(10).optional(),
      origin: z.string().min(2).max(10).optional().nullable(),
      currency: z.string().min(2).max(10).optional(),
      weightStep: z.number().positive().optional(),
      minWeight: z.number().nonnegative().optional(),
      maxWeight: z.number().positive().optional(),
      startDate: z.coerce.date().nullable().optional(),
      endDate: z.coerce.date().nullable().optional(),
      customerGroupIds: z.array(z.number().int().positive()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const rateRepo = getRateCardRepository();
    const rateService = getRateCardService();

    const card = await rateRepo.findById(id);
    if (!card) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bảng giá cước không tồn tại." });
    }

    const isDefaultCard = DEFAULT_RATE_CARD_CODES.includes(card.code);
    if (isDefaultCard) {
      const isOriginChanged = data.origin !== undefined && data.origin !== card.origin;
      const isStartDateChanged =
        data.startDate !== undefined &&
        ((data.startDate === null && card.startDate !== null) ||
          (data.startDate !== null && card.startDate === null) ||
          (data.startDate &&
            card.startDate &&
            new Date(data.startDate).getTime() !== new Date(card.startDate).getTime()));
      const isEndDateChanged =
        data.endDate !== undefined &&
        ((data.endDate === null && card.endDate !== null) ||
          (data.endDate !== null && card.endDate === null) ||
          (data.endDate &&
            card.endDate &&
            new Date(data.endDate).getTime() !== new Date(card.endDate).getTime()));
      const currentGroupIds = card.groups.map((g) => g.customerGroupId);
      const isGroupsChanged =
        data.customerGroupIds !== undefined &&
        (data.customerGroupIds.length !== currentGroupIds.length ||
          data.customerGroupIds.some((id) => !currentGroupIds.includes(id)));

      if (
        (data.code !== undefined && data.code !== card.code) ||
        (data.status !== undefined && data.status !== card.status) ||
        (data.shippingMethod !== undefined && data.shippingMethod !== card.shippingMethod) ||
        (data.country !== undefined && data.country !== card.country) ||
        isOriginChanged ||
        (data.currency !== undefined && data.currency !== card.currency) ||
        (data.weightStep !== undefined && Number(data.weightStep) !== Number(card.weightStep)) ||
        (data.minWeight !== undefined && Number(data.minWeight) !== Number(card.minWeight)) ||
        (data.maxWeight !== undefined && Number(data.maxWeight) !== Number(card.maxWeight)) ||
        isStartDateChanged ||
        isEndDateChanged ||
        isGroupsChanged
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Không thể chỉnh sửa các cấu hình cốt lõi của bảng giá cước mặc định (chỉ cho phép đổi tên hoặc cập nhật các nấc cước).",
        });
      }
    }

    if (data.code && data.code !== card.code && card.status !== "DRAFT") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Không thể chỉnh sửa mã bảng giá cước khi trạng thái khác Bản nháp (DRAFT).",
      });
    }

    await checkDuplicateCode(rateRepo, data.code, card.code);

    const updated = await rateRepo.update(id, data);

    await validateAndPublish(rateRepo, rateService, id, data.status, card.status);

    // Invalidate caches
    await rateService.invalidateRateCardCache(id).catch(() => {});

    return updated;
  });

// 6. Delete rate card (Admin authed)
export const remove = authedProcedure
  .use(requirePermission(Permissions.RATES_DELETE))
  .use(auditLog({ module: "rateCards", action: "DELETE", entityType: "RateCard" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const rateRepo = getRateCardRepository();
    const rateService = getRateCardService();

    const card = await rateRepo.findById(input.id);
    if (!card) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bảng giá cước không tồn tại." });
    }

    const isDefaultCard = DEFAULT_RATE_CARD_CODES.includes(card.code);
    if (isDefaultCard) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Không thể xóa bảng giá cước mặc định của hệ thống.",
      });
    }

    // Invalidate cache first
    await rateService.invalidateRateCardCache(input.id).catch(() => {});

    return await rateRepo.delete(input.id);
  });

// 7. Get Change Logs list (Admin authed)
export const listLogs = authedProcedure
  .use(requirePermission(Permissions.RATES_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const rateRepo = getRateCardRepository();
    return await rateRepo.findAuditLogs(input.id);
  });

// 8. Import slabs list (Admin authed)
export const importSlabs = authedProcedure
  .use(requirePermission(Permissions.RATES_UPDATE))
  .use(auditLog({ module: "rateCards", action: "IMPORT_SLABS", entityType: "RateCard" }))
  .input(
    z.object({
      rateCardId: z.number().int().positive(),
      slabs: z.array(slabInputSchema),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const rateRepo = getRateCardRepository();
    const rateService = getRateCardService();

    const card = await rateRepo.findById(input.rateCardId);
    if (!card) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bảng giá cước không tồn tại." });
    }

    // Validate slabs contiguity, gaps, and monotonicity
    try {
      rateService.validateSlabs(Number(card.minWeight), Number(card.maxWeight), input.slabs);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Dữ liệu nấc cước Excel không hợp lệ.",
      });
    }

    // Generate change maps for auditing
    const oldSlabsMap: Record<string, string> = {};
    for (const item of card.items) {
      const key = `Nấc ${item.startWeight}kg - ${item.endWeight}kg (${item.rateType})`;
      oldSlabsMap[key] = `${item.amount} ${card.currency || "USD"}`;
    }

    const newSlabsMap: Record<string, string> = {};
    for (const item of input.slabs) {
      const key = `Nấc ${item.startWeight}kg - ${item.endWeight}kg (${item.rateType})`;
      newSlabsMap[key] = `${item.amount} ${card.currency || "USD"}`;
    }

    const hasChanges = JSON.stringify(oldSlabsMap) !== JSON.stringify(newSlabsMap);

    // Save/replace slabs
    await rateRepo.replaceSlabs(input.rateCardId, input.slabs);

    if (hasChanges) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: ctx.user?.id || null,
            action: "UPDATE",
            module: "rateCards",
            entityId: String(input.rateCardId),
            entityType: "RateCard",
            oldValues: oldSlabsMap as Prisma.InputJsonValue,
            newValues: newSlabsMap as Prisma.InputJsonValue,
            ipAddress: ctx.ip || null,
            userAgent: ctx.userAgent || null,
            metadata: { source: "import-slabs" } as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        console.error("Failed to write manual audit log in importSlabs", err);
      }
    }

    // Invalidate cache
    await rateService.invalidateRateCardCache(input.rateCardId).catch(() => {});

    return { success: true };
  });

// 9. Export slabs template (Admin authed)
export const exportSlabsTemplate = authedProcedure
  .use(requirePermission(Permissions.RATES_READ))
  .input(
    z.object({
      minWeight: z.number().nonnegative(),
      maxWeight: z.number().positive(),
      weightStep: z.number().positive(),
      rateType: rateCardTypeSchema.default("STEP_FIXED"),
    }),
  )
  .query(({ input }) => {
    const { minWeight, maxWeight, weightStep, rateType } = input;
    const slabs = [];

    const S = new Decimal(weightStep);
    const minW = new Decimal(minWeight);
    const maxW = new Decimal(maxWeight);

    let prevWeight = minW;
    // Step loop using precise arithmetic
    while (prevWeight.lt(maxW)) {
      const nextWeight = prevWeight.plus(S);
      // Ensure we don't overshoot maxW
      const end = nextWeight.gt(maxW) ? maxW : nextWeight;

      slabs.push({
        startWeight: Number(prevWeight.toFixed(3)),
        endWeight: Number(end.toFixed(3)),
        rateType: rateType,
        amount: 0.0, // empty amount for admin to fill
      });

      prevWeight = end;
    }

    return { slabs };
  });

// 10. List Customer Groups helper
export const listGroups = authedProcedure
  .use(requirePermission(Permissions.RATES_READ))
  .query(async () => {
    return await prisma.customerGroup.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
  });

// 11. Duplicate rate card (Admin authed)
export const duplicate = authedProcedure
  .use(requirePermission(Permissions.RATES_CREATE))
  .use(auditLog({ module: "rateCards", action: "DUPLICATE", entityType: "RateCard" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const rateRepo = getRateCardRepository();
    const result = await rateRepo.duplicate(input.id);
    if (!result) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Bảng giá cước không tồn tại." });
    }
    return result;
  });
