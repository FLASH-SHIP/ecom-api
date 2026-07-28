import { createLogger } from "@flash-ship/ecom-lib/logger";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { gracefulShutdown } from "../shutdown/GracefulShutdown";

const log = createLogger("JobQueue");

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

interface JobDefinition {
  handler: JobHandler;
  retries: number;
}

const registeredJobs = new Map<string, JobDefinition>();
const queues = new Map<string, Queue>();
const activeWorkers: Worker[] = [];
let _queueRedisConnection: Redis | null = null;
let isShutdownRegistered = false;

function getQueueConnection(): Redis {
  if (!_queueRedisConnection) {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    _queueRedisConnection = new Redis(url, {
      maxRetriesPerRequest: null,
    });
  }
  return _queueRedisConnection;
}

function getQueue(queueName: string): Queue {
  let q = queues.get(queueName);
  if (!q) {
    q = new Queue(queueName, {
      // biome-ignore lint/suspicious/noExplicitAny: ioredis version mismatch between workspace and bullmq package
      connection: getQueueConnection() as any,
    });
    queues.set(queueName, q);
  }
  return q;
}

function registerShutdown() {
  if (isShutdownRegistered) return;
  isShutdownRegistered = true;

  gracefulShutdown.register("JobQueue", async () => {
    await JobQueue.close();
  });
}

/**
 * BullMQ-backed job queue system.
 * Falls back to synchronous execution if Redis is down.
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
  static async dispatch(
    queueName: string,
    payload: Record<string, unknown>,
    options?: {
      delay?: number;
      removeOnComplete?: boolean | number | { age: number; count?: number; limit?: number };
      removeOnFail?: boolean | number | { age: number; count?: number; limit?: number };
    },
  ): Promise<string> {
    try {
      const q = getQueue(queueName);
      const def = registeredJobs.get(queueName);
      const retries = def?.retries ?? 3;

      const job = await q.add("job", payload, {
        attempts: retries,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        delay: options?.delay,
        removeOnComplete: options?.removeOnComplete,
        removeOnFail: options?.removeOnFail,
      });
      return job.id ?? `bullmq-${Date.now()}`;
    } catch (err) {
      log.warn("BullMQ dispatch failed, falling back to sync execution", {
        queue: queueName,
        error: err instanceof Error ? err.message : String(err),
      });

      const def = registeredJobs.get(queueName);
      if (def) {
        def.handler(payload).catch((syncErr) => {
          log.error("Sync fallback failed", {
            queue: queueName,
            error: syncErr instanceof Error ? syncErr.message : String(syncErr),
          });
        });
      }
      return `sync-${Date.now()}`;
    }
  }

  /**
   * Process one job.
   * @deprecated Handled automatically by BullMQ Worker
   */
  static async processOne(_queueName: string): Promise<boolean> {
    return false;
  }

  /**
   * Start a worker loop that continuously processes jobs from a queue.
   */
  static startWorker(queueName: string): Worker {
    const def = registeredJobs.get(queueName);
    if (!def) {
      throw new Error(`[JobQueue] No handler registered for queue: ${queueName}`);
    }

    const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null,
    });

    const worker = new Worker(
      queueName,
      async (job) => {
        await def.handler(job.data);
      },
      {
        // biome-ignore lint/suspicious/noExplicitAny: ioredis version mismatch between workspace and bullmq package
        connection: connection as any,
        concurrency: 1,
      },
    );

    worker.on("failed", (job, err) => {
      log.error("Job failed in queue", {
        queue: queueName,
        jobId: job?.id,
        error: err.message,
      });
    });

    activeWorkers.push(worker);
    registerShutdown();

    log.info("BullMQ Worker started for queue", { queue: queueName });
    return worker;
  }

  /**
   * Close all active workers and the queue Redis connection manually.
   */
  static async close(): Promise<void> {
    log.info("Closing JobQueue...");
    await Promise.all(activeWorkers.map((w) => w.close()));
    activeWorkers.length = 0;

    if (_queueRedisConnection) {
      await _queueRedisConnection.quit();
      _queueRedisConnection = null;
    }
    log.info("JobQueue closed successfully");
  }

  /**
   * Get the length of a named queue.
   */
  static async getQueueLength(queueName: string): Promise<number> {
    try {
      const q = getQueue(queueName);
      const counts = await q.getJobCounts("waiting", "active", "delayed");
      return (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get dead letter queue length.
   */
  static async getDeadLetterCount(queueName: string): Promise<number> {
    try {
      const q = getQueue(queueName);
      const counts = await q.getJobCounts("failed");
      return counts.failed ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get all registered queues as BullMQ Queue instances.
   */
  static getQueues(): Queue[] {
    const list: Queue[] = [];
    for (const name of registeredJobs.keys()) {
      list.push(getQueue(name));
    }
    return list;
  }
}
