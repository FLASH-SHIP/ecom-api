import { lockManager } from "@ecom/lib/lock";
import { createLogger } from "@ecom/lib/logger";
import { prisma } from "@ecom/prisma";
import { eventBus } from "./EventBus";

const log = createLogger("OutboxWorker");

/**
 * Outbox Worker with adaptive polling (PERF-04).
 *
 * Instead of polling at a fixed 5s interval (~17K queries/day even when idle),
 * uses exponential backoff:
 * - When events are found: polls every 1s (fast processing)
 * - When idle: doubles interval up to 30s (saves DB resources)
 * - Resets to fast polling as soon as events appear
 */
export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private maxAttempts = 5;

  private readonly baseIntervalMs: number;
  private readonly maxIntervalMs: number;
  private currentIntervalMs: number;

  constructor(baseIntervalMs = 1000, maxIntervalMs = 30000) {
    this.baseIntervalMs = baseIntervalMs;
    this.maxIntervalMs = maxIntervalMs;
    this.currentIntervalMs = baseIntervalMs;
  }

  start() {
    if (this.timer) return;
    log.info("Starting Outbox worker (adaptive polling)...");
    this.scheduleNext();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      log.info("Stopped Outbox worker.");
    }
  }

  private scheduleNext() {
    this.timer = setTimeout(() => {
      this.process()
        .catch((err) => {
          log.error("Unhandled error in outbox worker loop", { error: err.message });
        })
        .finally(() => {
          // Schedule next poll (only if not stopped)
          if (this.timer !== null) {
            this.scheduleNext();
          }
        });
    }, this.currentIntervalMs);
  }

  async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Acquire distributed lock to prevent concurrent execution across replicas
    const lockToken = await lockManager.acquire("outbox:worker:lock", 10000);
    if (!lockToken) {
      log.debug("Outbox worker processing skipped: lock active on another instance.");
      this.isProcessing = false;
      return;
    }

    try {
      // Find pending outbox events (limit to 20 at a time to prevent memory issues)
      const events = await prisma.outboxEvent.findMany({
        where: {
          status: "PENDING",
        },
        take: 20,
        orderBy: {
          createdAt: "asc",
        },
      });

      if (events.length === 0) {
        // Backoff: double interval when idle (up to maxIntervalMs)
        this.currentIntervalMs = Math.min(this.currentIntervalMs * 2, this.maxIntervalMs);
        return;
      }

      // Reset to fast polling when events are found
      this.currentIntervalMs = this.baseIntervalMs;

      log.info(`Found ${events.length} pending outbox events to process`);

      for (const eventRecord of events) {
        try {
          // Dispatch to the event bus
          // biome-ignore lint/suspicious/noExplicitAny: event payloads are dynamic JSON values
          await eventBus.emit(eventRecord.event as any, eventRecord.payload as any);

          // Mark as processed
          await prisma.outboxEvent.update({
            where: { id: eventRecord.id },
            data: {
              status: "SENT",
              processedAt: new Date(),
              attempts: eventRecord.attempts + 1,
            },
          });
        } catch (err) {
          const attempts = eventRecord.attempts + 1;
          const status = attempts >= this.maxAttempts ? "FAILED" : "PENDING";
          log.error(`Failed to process outbox event ${eventRecord.id}`, {
            error: (err as Error).message,
          });

          await prisma.outboxEvent.update({
            where: { id: eventRecord.id },
            data: {
              status,
              attempts,
              error: (err as Error).message || String(err),
            },
          });
        }
      }
    } catch (err) {
      log.error("Outbox worker processing loop encountered an error", {
        error: (err as Error).message,
      });
    } finally {
      await lockManager.release("outbox:worker:lock", lockToken);
      this.isProcessing = false;
    }
  }
}

export const outboxWorker = new OutboxWorker();
