import { createLogger } from "@ecom/lib/logger";

const log = createLogger("TaskScheduler");

interface ScheduledTask {
  name: string;
  cronExpression: string;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * Laravel-style Task Scheduler for Node.js/TypeScript.
 *
 * Usage:
 *   const scheduler = new TaskScheduler();
 *   scheduler
 *     .task("Prune audit logs")
 *     .cron("0 2 * * *")
 *     .handle(async () => { ... });
 *
 *   scheduler.start();
 */
export class TaskScheduler {
  private tasks: ScheduledTask[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  task(name: string) {
    const task: ScheduledTask = {
      name,
      cronExpression: "",
      handler: async () => {},
      enabled: true,
    };

    const builder = {
      cron: (expression: string) => {
        task.cronExpression = expression;
        return builder;
      },
      handle: (handler: () => Promise<void>) => {
        task.handler = handler;
        this.tasks.push(task);
        return builder;
      },
      disable: () => {
        task.enabled = false;
        return builder;
      },
    };

    return builder;
  }

  start(checkIntervalMs = 60_000) {
    if (this.interval) return;

    log.info("Task scheduler started", { taskCount: this.tasks.length });

    this.interval = setInterval(() => {
      this.tick();
    }, checkIntervalMs);

    // Run initial tick
    this.tick();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      log.info("Task scheduler stopped");
    }
  }

  getRegisteredTasks() {
    return this.tasks.map((t) => ({
      name: t.name,
      cronExpression: t.cronExpression,
      enabled: t.enabled,
      lastRunAt: t.lastRunAt,
    }));
  }

  private tick() {
    const now = new Date();

    for (const task of this.tasks) {
      if (!task.enabled) continue;
      if (!this.shouldRun(task.cronExpression, now)) continue;

      log.info("Running scheduled task", { name: task.name });

      task
        .handler()
        .then(() => {
          task.lastRunAt = new Date();
          log.info("Scheduled task completed", { name: task.name });
        })
        .catch((err) => {
          log.error("Scheduled task failed", {
            name: task.name,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }
  }

  /**
   * Simple cron matcher. Supports: minute hour day-of-month month day-of-week.
   * Supports * and step values (e.g., *​/5).
   */
  private shouldRun(cronExpression: string, now: Date): boolean {
    const parts = cronExpression.split(/\s+/);
    if (parts.length !== 5) return false;

    const minute = now.getMinutes();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const month = now.getMonth() + 1;
    const dayOfWeek = now.getDay();

    const values = [minute, hour, dayOfMonth, month, dayOfWeek];

    return parts.every((part, i) => this.matchField(part, values[i] ?? 0));
  }

  private matchField(field: string, value: number): boolean {
    if (field === "*") return true;

    // Step values: */5
    if (field.startsWith("*/")) {
      const step = Number.parseInt(field.slice(2), 10);
      return Number.isNaN(step) ? false : value % step === 0;
    }

    // Comma-separated: 1,15,30
    const parts = field.split(",");
    return parts.some((p) => {
      // Range: 1-5
      if (p.includes("-")) {
        const [start, end] = p.split("-").map(Number);
        return start !== undefined && end !== undefined && value >= start && value <= end;
      }
      return Number(p) === value;
    });
  }
}
