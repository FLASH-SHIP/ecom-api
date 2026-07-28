import { getOrderRepository, getOrderService } from "@ecom/features/di/containers/OrderService";
import {
  mapToAdminOrderDetailResponse,
  mapToAdminOrderSummaryResponse,
} from "@ecom/features/order/mappers/AdminOrderMapper";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { RedisCache } from "@flash-ship/ecom-lib/redis";
import type {
  Customer,
  Order,
  OrderActivityLog,
  OrderFeeItem,
  OrderProduct,
  OrderTrackingCheckpoint,
} from "@ecom/prisma";
import { OrderStatus, type Prisma } from "@ecom/prisma";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const orderStatusSchema = z.nativeEnum(OrderStatus);

export interface CachedOrder
  extends Omit<
    Order,
    | "declaredWeight"
    | "baseShippingFee"
    | "surchargeFee"
    | "totalFee"
    | "actualWeight"
    | "volumeWeight"
    | "chargeableWeight"
  > {
  declaredWeight: Prisma.Decimal | number | string;
  baseShippingFee: Prisma.Decimal | number | string;
  surchargeFee: Prisma.Decimal | number | string;
  totalFee: Prisma.Decimal | number | string;
  actualWeight: Prisma.Decimal | number | string | null;
  volumeWeight: Prisma.Decimal | number | string | null;
  chargeableWeight: Prisma.Decimal | number | string | null;
  activityLogs: Omit<OrderActivityLog, "orderId">[];
  trackingCheckpoints: Omit<OrderTrackingCheckpoint, "orderId">[];
  customer: Pick<Customer, "name" | "email" | "username" | "phone">;
  feeItems?: Omit<OrderFeeItem, "orderId">[];
  products?: Omit<OrderProduct, "orderId">[];
}

const orderCache = new RedisCache<CachedOrder>("order-details", 300); // 5-minute cache TTL

function restoreLogDates(logs?: Omit<OrderActivityLog, "orderId">[]) {
  if (!logs) return;
  for (const log of logs) {
    if (log.createdAt) log.createdAt = new Date(log.createdAt);
  }
}

function restoreCheckpointDates(cps?: Omit<OrderTrackingCheckpoint, "orderId">[]) {
  if (!cps) return;
  for (const cp of cps) {
    if (cp.checkpointDate) cp.checkpointDate = new Date(cp.checkpointDate);
    if (cp.createdAt) cp.createdAt = new Date(cp.createdAt);
  }
}

function restoreOrderDates(order?: CachedOrder): CachedOrder | undefined {
  if (!order) return order;
  if (order.createdAt) order.createdAt = new Date(order.createdAt);
  if (order.updatedAt) order.updatedAt = new Date(order.updatedAt);
  restoreLogDates(order.activityLogs);
  restoreCheckpointDates(order.trackingCheckpoints);
  return order;
}

// 1. List all orders in the system (Admin only)
export const list = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .input(
    z
      .object({
        customerId: z.string().min(1).optional(),
        status: orderStatusSchema.optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(20),
        sortBy: z.enum(["id", "createdAt", "orderCode", "status"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const repo = getOrderRepository();
    const result = await repo.findMany(input ?? {});
    return {
      ...result,
      data: result.data.map(mapToAdminOrderSummaryResponse),
    };
  });

// 2. Get single order details including logs & checkpoints
export const get = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_READ))
  .input(z.object({ id: z.string().min(1) }))
  .query(async ({ input }) => {
    // Try cache first
    const cached = await orderCache.get(input.id);
    if (cached) {
      return restoreOrderDates(cached);
    }

    const repo = getOrderRepository();
    const order = await repo.findById(input.id);
    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Đơn hàng không tồn tại",
      });
    }

    // Fetch activity logs and checkpoints
    const [activityLogs, trackingCheckpoints] = await Promise.all([
      repo.findActivityLogs(order.id),
      repo.findTrackingCheckpoints(order.id),
    ]);

    const result = mapToAdminOrderDetailResponse({
      ...order,
      activityLogs,
      trackingCheckpoints,
    });

    // Cache the result
    await orderCache.set(input.id, result as any);

    return result;
  });

// 3. Update order status (Admin only)
export const updateStatus = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .input(
    z.object({
      id: z.string().min(1),
      status: orderStatusSchema,
      metadata: z.record(z.string(), z.any()).optional().nullable(),
      expectedVersion: z.number().int().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getOrderService();
    const operatorId = ctx.user?.email || ctx.user?.id?.toString() || "admin";

    const updated = await service.updateOrderStatus(
      input.id,
      input.status,
      operatorId,
      input.metadata,
      input.expectedVersion,
    );

    // Invalidate Cache
    await orderCache.invalidate(input.id);

    return updated;
  });

// 4. Manually add tracking checkpoint scan event (Admin only)
export const addCheckpoint = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .input(
    z.object({
      orderId: z.string().min(1),
      checkpointDate: z
        .string()
        .or(z.date())
        .transform((d) => new Date(d)),
      description: z.string().min(1),
      location: z.string().optional().nullable(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getOrderService();
    const operatorId = ctx.user?.email || ctx.user?.id?.toString() || "admin";
    const res = await service.addTrackingCheckpoint(
      input.orderId,
      {
        checkpointDate: input.checkpointDate,
        description: input.description,
        location: input.location,
      },
      operatorId,
    );

    // Invalidate Cache
    await orderCache.invalidate(input.orderId);

    return res;
  });

// 5. Recalculate order fees (Admin only)
export const recalculate = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .input(
    z.object({
      id: z.string().min(1),
      forceRefresh: z.boolean().default(false),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getOrderService();
    const operatorId = ctx.user?.email || ctx.user?.id?.toString() || "admin";
    const res = await service.recalculateOrderFees(input.id, operatorId, input.forceRefresh);

    // Invalidate Cache
    await orderCache.invalidate(input.id);

    return res;
  });
