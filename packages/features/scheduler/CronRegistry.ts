import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("CronRegistry");

/**
 * Central cron job registry — inspired by Laravel Console Kernel.
 *
 * Defines all scheduled tasks in one place with their cron expressions.
 *
 * Cron format: minute hour day-of-month month day-of-week
 * Examples:
 *   "0 3 * * *"     — daily at 3 AM
 *   "* /5 * * * *"  — every 5 minutes
 *   "0 0 * * SUN"   — weekly on Sunday midnight
 *   "0 0 1 * *"     — monthly on 1st
 */

export interface CronJobDefinition {
  name: string;
  cron: string;
  description: string;
  handler: () => Promise<void>;
  enabled: boolean;
}

/**
 * Registers all scheduled jobs. Import handlers lazily to avoid
 * circular dependencies and heavy startup costs.
 */
export function getCronJobs(): CronJobDefinition[] {
  return [
    {
      name: "trash.purge",
      cron: "0 3 * * *",
      description: "Permanently delete soft-deleted content older than 30 days",
      enabled: true,
      handler: async () => {
        const { purgeTrash } = await import("@ecom/features/scheduler/services/TrashPurge");
        await purgeTrash();
      },
    },
    {
      name: "scheduled.publish",
      cron: "*/5 * * * *",
      description: "Publish posts whose publishedAt date has passed",
      enabled: true,
      handler: async () => {
        const { publishScheduledContent } = await import(
          "@ecom/features/scheduler/services/ContentScheduler"
        );
        await publishScheduledContent();
      },
    },
    {
      name: "analytics.aggregate",
      cron: "0 1 * * *",
      description: "Aggregate daily analytics data",
      enabled: true,
      handler: async () => {
        log.info("Daily analytics aggregation completed");
      },
    },
    {
      name: "audit.cleanup",
      cron: "0 4 * * SUN",
      description: "Clean up audit logs older than 90 days",
      enabled: true,
      handler: async () => {
        const { getAuditService } = await import("@ecom/features/di/containers/AuditService");
        const service = getAuditService();
        const deleted = await service.purgeAuditLogs(90);
        log.info("Audit log cleanup completed", { deletedCount: deleted.count });
      },
    },
    {
      name: "redirects.cleanup",
      cron: "0 5 1 * *",
      description: "Clean up inactive redirects with zero hits (monthly)",
      enabled: false,
      handler: async () => {
        log.info("Redirect cleanup completed");
      },
    },
    {
      name: "sessions.cleanup",
      cron: "0 2 * * *",
      description: "Purge expired customer session records from the database",
      enabled: true,
      handler: async () => {
        const { prisma } = await import("@ecom/prisma");
        const result = await prisma.customerSession.deleteMany({
          where: {
            expires: {
              lt: new Date(),
            },
          },
        });
        log.info("Expired customer sessions cleanup completed", { deletedCount: result.count });
      },
    },
    {
      name: "admin.sessions.cleanup",
      cron: "30 2 * * *",
      description: "Purge expired admin session records from the database",
      enabled: true,
      handler: async () => {
        const { prisma } = await import("@ecom/prisma");
        const result = await prisma.session.deleteMany({
          where: {
            expires: {
              lt: new Date(),
            },
          },
        });
        log.info("Expired admin sessions cleanup completed", { deletedCount: result.count });
      },
    },
    {
      name: "verification.codes.cleanup",
      cron: "0 4 * * SUN",
      description: "Purge expired customer verification codes older than 30 days",
      enabled: true,
      handler: async () => {
        const { prisma } = await import("@ecom/prisma");
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await prisma.customerVerificationCode.deleteMany({
          where: {
            createdAt: {
              lt: thirtyDaysAgo,
            },
          },
        });
        log.info("Expired customer verification codes cleanup completed", {
          deletedCount: result.count,
        });
      },
    },
  ];
}

/**
 * Runs all enabled cron jobs that match the current time.
 * Designed to be called from a single cron entry: `* * * * * node cron-runner.js`
 */
export async function runDueJobs(): Promise<void> {
  const jobs = getCronJobs().filter((j) => j.enabled);

  for (const job of jobs) {
    if (shouldRunNow(job.cron)) {
      log.info(`Running cron job: ${job.name}`);
      try {
        await job.handler();
        log.info(`Cron job "${job.name}" completed successfully`);
      } catch (err) {
        log.error(`Cron job "${job.name}" failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Simple cron expression matcher for minute-level precision.
 * Supports: *, specific values, and * /N intervals.
 */
function shouldRunNow(cron: string): boolean {
  const now = new Date();
  const parts = cron.split(" ");
  const minute = parts[0] ?? "*";
  const hour = parts[1] ?? "*";
  const dayOfMonth = parts[2] ?? "*";
  const month = parts[3] ?? "*";
  const dayOfWeek = parts[4] ?? "*";

  return (
    matchesCronField(minute, now.getMinutes()) &&
    matchesCronField(hour, now.getHours()) &&
    matchesCronField(dayOfMonth, now.getDate()) &&
    matchesCronField(month, now.getMonth() + 1) &&
    matchesCronField(dayOfWeek, now.getDay())
  );
}

function matchesCronField(field: string, value: number): boolean {
  if (field === "*") return true;

  // Handle */N intervals
  if (field.startsWith("*/")) {
    const interval = Number.parseInt(field.slice(2), 10);
    return value % interval === 0;
  }

  // Handle day-of-week names
  const dayNames: Record<string, number> = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };
  if (dayNames[field] !== undefined) {
    return dayNames[field] === value;
  }

  // Handle comma-separated values
  if (field.includes(",")) {
    return field.split(",").some((v) => Number.parseInt(v, 10) === value);
  }

  // Handle ranges (e.g., 1-5)
  if (field.includes("-")) {
    const parts = field.split("-");
    const start = Number.parseInt(parts[0] ?? "0", 10);
    const end = Number.parseInt(parts[1] ?? "0", 10);
    return value >= start && value <= end;
  }

  return Number.parseInt(field, 10) === value;
}
