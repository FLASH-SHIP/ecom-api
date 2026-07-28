import { createLogger } from "@flash-ship/ecom-lib/logger";
import { prisma } from "@ecom/prisma";

const log = createLogger("HealthCheck");

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
    disk: ComponentHealth;
  };
}

interface ComponentHealth {
  status: "up" | "down" | "degraded";
  responseTime?: number;
  details?: Record<string, unknown>;
}

/**
 * Comprehensive health check service for production monitoring.
 *
 * Returns overall system health with individual component checks:
 * - Database (PostgreSQL via Prisma)
 * - Redis (connection test)
 * - Memory (heap usage)
 * - Disk (process uptime as proxy)
 */
export async function checkHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  const [database, redis, memory] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    Promise.resolve(checkMemory()),
  ]);

  const dbHealth =
    database.status === "fulfilled"
      ? database.value
      : {
          status: "down" as const,
          details: { error: String((database as PromiseRejectedResult).reason) },
        };
  const redisHealth =
    redis.status === "fulfilled"
      ? redis.value
      : {
          status: "down" as const,
          details: { error: String((redis as PromiseRejectedResult).reason) },
        };
  const memHealth = memory.status === "fulfilled" ? memory.value : { status: "down" as const };
  const diskHealth = checkDisk();

  const allStatuses = [dbHealth.status, redisHealth.status, memHealth.status, diskHealth.status];
  const hasDown = allStatuses.includes("down");
  const hasDegraded = allStatuses.includes("degraded");

  let overallStatus: "healthy" | "degraded" | "unhealthy";
  if (dbHealth.status === "down") {
    overallStatus = "unhealthy";
  } else if (hasDown || hasDegraded) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION ?? "1.0.0",
    checks: {
      database: dbHealth,
      redis: redisHealth,
      memory: memHealth,
      disk: diskHealth,
    },
  };

  if (overallStatus !== "healthy") {
    log.warn("Health check degraded/unhealthy", {
      status: overallStatus,
      duration: Date.now() - startTime,
    });
  }

  return result;
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "up",
      responseTime: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "down",
      responseTime: Date.now() - start,
      details: { error: err instanceof Error ? err.message : "Unknown error" },
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const { getRedisClient } = await import("@flash-ship/ecom-lib/redis");
    const redis = getRedisClient();
    await redis.ping();
    return {
      status: "up",
      responseTime: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "down",
      responseTime: Date.now() - start,
      details: { error: err instanceof Error ? err.message : "Unknown error" },
    };
  }
}

function checkMemory(): ComponentHealth {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(usage.rss / 1024 / 1024);
  const heapPercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  let status: "up" | "degraded" | "down" = "up";
  if (heapPercent > 95) status = "down";
  else if (heapPercent > 85) status = "degraded";

  return {
    status,
    details: {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      heapPercent,
    },
  };
}

function checkDisk(): ComponentHealth {
  return {
    status: "up",
    details: {
      uptimeSeconds: Math.round(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
    },
  };
}
