import { getRedisClient } from "@ecom/lib/redis";

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

interface JobDefinition {
  handler: JobHandler;
  retries: number;
}

interface QueuedJob {
  id: string;
  queue: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxRetries: number;
  createdAt: string;
}

const registeredJobs = new Map<string, JobDefinition>();
const QUEUE_PREFIX = "ecom:jobs:";

/**
 * Redis-backed job queue system.
 * Uses Redis lists as FIFO queues with retry support.
 *
 * For production at scale, migrate to BullMQ by adding:
 *   yarn add bullmq
 * and replacing this implementation.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional namespace pattern for queue operations with module-level registered handlers
export class JobQueue {
  /**
   * Register a job handler for a named queue.
   */
  static register(queueName: string, handler: JobHandler, retries = 3) {
    registeredJobs.set(queueName, { handler, retries });
  }

  /**
   * Dispatch a job to a named queue.
   */
  static async dispatch(queueName: string, payload: Record<string, unknown>): Promise<string> {
    const redis = getRedisClient();
    if (!redis) {
      // Fallback: execute synchronously if Redis is unavailable
      const def = registeredJobs.get(queueName);
      if (def) {
        def.handler(payload).catch((err) => {
          console.error(`[JobQueue] Sync fallback failed for ${queueName}:`, err);
        });
      }
      return `sync-${Date.now()}`;
    }

    const jobId = `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: QueuedJob = {
      id: jobId,
      queue: queueName,
      payload,
      attempts: 0,
      maxRetries: registeredJobs.get(queueName)?.retries ?? 3,
      createdAt: new Date().toISOString(),
    };

    await redis.lpush(`${QUEUE_PREFIX}${queueName}`, JSON.stringify(job));
    return jobId;
  }

  /**
   * Process one job from a named queue.
   * Returns true if a job was processed, false if queue was empty.
   */
  static async processOne(queueName: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    const raw = await redis.rpop(`${QUEUE_PREFIX}${queueName}`);
    if (!raw) return false;

    const job: QueuedJob = JSON.parse(raw);
    const def = registeredJobs.get(queueName);

    if (!def) {
      console.error(`[JobQueue] No handler registered for queue: ${queueName}`);
      return true;
    }

    try {
      await def.handler(job.payload);
    } catch (_err) {
      job.attempts += 1;
      if (job.attempts < job.maxRetries) {
        // Re-queue for retry
        await redis.lpush(`${QUEUE_PREFIX}${queueName}`, JSON.stringify(job));
        console.warn(
          `[JobQueue] Job ${job.id} failed (attempt ${job.attempts}/${job.maxRetries}), re-queued`,
        );
      } else {
        // Move to dead letter queue
        await redis.lpush(`${QUEUE_PREFIX}${queueName}:dead`, JSON.stringify(job));
        console.error(`[JobQueue] Job ${job.id} exhausted retries, moved to dead letter queue`);
      }
    }

    return true;
  }

  /**
   * Start a worker loop that continuously processes jobs from a queue.
   */
  static startWorker(queueName: string, pollIntervalMs = 1000): NodeJS.Timeout {
    const timer = setInterval(async () => {
      try {
        let processed = true;
        while (processed) {
          processed = await JobQueue.processOne(queueName);
        }
      } catch (err) {
        console.error(`[JobQueue] Worker error for ${queueName}:`, err);
      }
    }, pollIntervalMs);

    console.info(`[JobQueue] Worker started for queue: ${queueName}`);
    return timer;
  }

  /**
   * Get the length of a named queue.
   */
  static async getQueueLength(queueName: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) return 0;
    return redis.llen(`${QUEUE_PREFIX}${queueName}`);
  }

  /**
   * Get dead letter queue length.
   */
  static async getDeadLetterCount(queueName: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) return 0;
    return redis.llen(`${QUEUE_PREFIX}${queueName}:dead`);
  }
}
