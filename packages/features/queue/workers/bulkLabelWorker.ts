import { LabelStatus, OrderStatus, prisma } from "@ecom/prisma";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import { getRedisClient } from "@flash-ship/ecom-lib/redis";
import { JobQueue } from "../JobQueue";

const log = createLogger("BulkLabelWorker");

export const BULK_LABEL_QUEUE = "bulk-label-purchase";

export interface BulkLabelJobPayload {
  orderId: string;
  customerId?: string;
  operatorId?: string;
  batchId?: string;
}

/**
 * Update Redis batch status counter if batchId is attached.
 */
async function updateBatchProgress(batchId: string, status: "succeeded" | "failed") {
  try {
    const redis = getRedisClient();
    const key = `batch:progress:${batchId}`;
    await redis.hincrby(key, status, 1);
    await redis.hincrby(key, "processed", 1);
    await redis.expire(key, 86400); // 24 hours TTL
  } catch (err) {
    log.warn("Failed to update batch progress in Redis", { batchId, error: err });
  }
}

/**
 * Register the bulk label purchase job handler.
 * Call this once during application startup.
 */
export function registerBulkLabelWorker() {
  JobQueue.register(
    BULK_LABEL_QUEUE,
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: bulk label worker handling complexity
    async (payload) => {
      const data = payload as unknown as BulkLabelJobPayload;
      log.info("Processing bulk label purchase job", {
        orderId: data.orderId,
        batchId: data.batchId,
      });

      const order = await prisma.order.findUnique({
        where: { id: data.orderId },
        select: {
          id: true,
          orderCode: true,
          status: true,
          labelStatus: true,
          customerId: true,
          trackingNumber: true,
          labelUrl: true,
        },
      });

      if (!order) {
        log.warn("Order not found for label purchase job", { orderId: data.orderId });
        if (data.batchId) await updateBatchProgress(data.batchId, "failed");
        return;
      }

      // If order already has tracking number & label URL, or status is LABEL_CREATED / CANCELLED, skip job
      const hasLabel = Boolean(order.trackingNumber && order.labelUrl);
      if (
        hasLabel ||
        order.status === OrderStatus.LABEL_CREATED ||
        order.status === OrderStatus.CANCELLED
      ) {
        log.info("Order already has label or is cancelled, skipping job", {
          orderId: data.orderId,
          status: order.status,
          trackingNumber: order.trackingNumber,
        });
        if (data.batchId) await updateBatchProgress(data.batchId, "succeeded");
        return;
      }

      // Set label status to PROCESSING to show UI badge "Đang mua nhãn..." and lock against duplicate processing
      await prisma.order.update({
        where: { id: data.orderId },
        data: { labelStatus: LabelStatus.PROCESSING },
      });

      try {
        const { getOrderLabelService } = await import(
          "@ecom/features/di/containers/OrderLabelService"
        );
        const orderLabelService = getOrderLabelService();

        const result = await orderLabelService.purchaseLabel({
          orderId: data.orderId,
          customerId: data.customerId || order.customerId,
          operatorId: data.operatorId,
        });

        // Check if address was ambiguous (202)
        if (result && "isAmbiguous" in result && result.isAmbiguous) {
          log.warn("Address ambiguous for order during async label purchase", {
            orderId: data.orderId,
            orderCode: order.orderCode,
            message: result.message,
          });
          await prisma.order.update({
            where: { id: data.orderId },
            data: { labelStatus: LabelStatus.FAILED },
          });
          if (data.batchId) await updateBatchProgress(data.batchId, "failed");
          return;
        }

        await prisma.order.update({
          where: { id: data.orderId },
          data: { labelStatus: LabelStatus.SUCCESS },
        });

        if (data.batchId) await updateBatchProgress(data.batchId, "succeeded");
        log.info("Successfully purchased label for order", {
          orderId: data.orderId,
          orderCode: order.orderCode,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log.error("Failed to purchase label in worker", {
          orderId: data.orderId,
          orderCode: order.orderCode,
          error: errMsg,
        });

        await prisma.order
          .update({
            where: { id: data.orderId },
            data: { labelStatus: LabelStatus.FAILED },
          })
          .catch(() => {});

        if (data.batchId) await updateBatchProgress(data.batchId, "failed");
        throw err; // Re-throw to trigger BullMQ retry policy if attempts remaining
      }
    },
    3, // 3 retries with exponential backoff
  );
}

/**
 * Dispatch an order label purchase task to BullMQ queue.
 */
export async function queueBulkLabelPurchase(data: BulkLabelJobPayload): Promise<string> {
  return JobQueue.dispatch(BULK_LABEL_QUEUE, data as unknown as Record<string, unknown>);
}
