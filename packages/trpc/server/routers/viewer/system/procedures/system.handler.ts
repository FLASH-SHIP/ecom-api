import { getAuditService } from "@ecom/features/di/containers/AuditService";
import type { FilterFieldConfigMap } from "@ecom/features/shared/utils/buildPrismaWhere";
import { buildPrismaWhere } from "@ecom/features/shared/utils/buildPrismaWhere";
import { categoryCache, permissionsCache, settingsCache } from "@flash-ship/ecom-lib/cache";
import { signQueueDashboardToken } from "@flash-ship/ecom-lib/jwt";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { getRedisClient } from "@flash-ship/ecom-lib/redis";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { filtersInputSchema } from "@flash-ship/ecom-trpc/server/shared/filterSchema";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const REQUEST_LOG_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  method: { prismaField: "method", type: "enum" },
  url: { prismaField: "url", type: "string" },
  statusCode: { prismaField: "statusCode", type: "number" },
  duration: { prismaField: "duration", type: "number" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

const requestLogFiltersSchema = z.object({
  filters: filtersInputSchema,
  search: z.string().max(500).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).optional(),
  sortBy: z.enum(["id", "createdAt", "statusCode", "duration"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const listRequestLogs = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .input(requestLogFiltersSchema)
  .query(async ({ input }) => {
    const service = getAuditService();
    const { page, pageSize, filters, search } = input;
    const prismaWhere = buildPrismaWhere(filters, REQUEST_LOG_FILTER_FIELDS);
    const resolvedPerPage = pageSize ?? 50;
    return service.getRequestLogs(
      {
        where: prismaWhere,
        search,
        sortBy: input.sortBy,
        sortDir: input.sortDir,
      },
      page,
      resolvedPerPage,
    );
  });

export const getRequestStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .query(async () => {
    const service = getAuditService();
    return service.getRequestStats();
  });

export const purgeRequestLogs = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .use(auditLog({ module: "system", action: "PURGE", entityType: "RequestLog" }))
  .input(z.object({ olderThanDays: z.number().int().min(0).max(365) }))
  .mutation(async ({ input }) => {
    const service = getAuditService();
    return service.purgeRequestLogs(input.olderThanDays);
  });

export const deleteRequestLog = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    const service = getAuditService();
    return service.deleteRequestLog(input.id);
  });

export const getSystemInfo = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .query(async () => {
    const service = getAuditService();
    return service.getSystemInfo();
  });

// ─── Dashboard Stats ───────────────────────

export const getDashboardStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .query(async () => {
    const { getDashboardStats: getStats } = await import(
      "@ecom/features/shared/services/DashboardStats"
    );
    return getStats();
  });

// ─── Analytics ───────────────────────

export const getPublishingTrends = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .input(z.object({ days: z.number().int().positive().max(365).default(30) }).optional())
  .query(async ({ input }) => {
    const { getAnalyticsService } = await import(
      "@ecom/features/analytics/services/AnalyticsService"
    );
    return getAnalyticsService().getPublishingTrends(input?.days ?? 30);
  });

export const getPopularContent = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .input(z.object({ limit: z.number().int().positive().max(50).default(10) }).optional())
  .query(async ({ input }) => {
    const { getAnalyticsService } = await import(
      "@ecom/features/analytics/services/AnalyticsService"
    );
    return getAnalyticsService().getPopularContent(input?.limit ?? 10);
  });

export const getStatusBreakdown = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .query(async () => {
    const { getAnalyticsService } = await import(
      "@ecom/features/analytics/services/AnalyticsService"
    );
    return getAnalyticsService().getStatusBreakdown();
  });

export const getAuthorStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .input(z.object({ limit: z.number().int().positive().max(50).default(10) }).optional())
  .query(async ({ input }) => {
    const { getAnalyticsService } = await import(
      "@ecom/features/analytics/services/AnalyticsService"
    );
    return getAnalyticsService().getAuthorStats(input?.limit ?? 10);
  });

export const getCategoryStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .query(async () => {
    const { getAnalyticsService } = await import(
      "@ecom/features/analytics/services/AnalyticsService"
    );
    return getAnalyticsService().getCategoryStats();
  });

export const getEngagementOverview = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .input(z.object({ days: z.number().int().positive().max(365).default(30) }).optional())
  .query(async ({ input }) => {
    const { getAnalyticsService } = await import(
      "@ecom/features/analytics/services/AnalyticsService"
    );
    return getAnalyticsService().getEngagementOverview(input?.days ?? 30);
  });

// ─── Cache Management ───────────────────────

const CACHE_NAMESPACE_PATTERNS: Record<string, string> = {
  settings: "cache:settings:*",
  category: "cache:category:*",
  permissions: "cache:permissions:*",
  ratelimit: "ratelimit:*",
  // "all" intentionally covers only app cache, NOT rate-limit state
  all: "cache:*",
};

/**
 * Non-blocking key scan using Redis CURSOR SCAN.
 * Safe for any dataset size — KEYS is O(N) and blocks the entire server.
 */
async function scanKeys(
  redis: ReturnType<typeof getRedisClient>,
  pattern: string,
): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

/**
 * Delete keys in chunks of 500 via pipeline to avoid a single DEL with
 * thousands of arguments (which would also block Redis momentarily).
 */
async function deleteKeys(redis: ReturnType<typeof getRedisClient>, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    const pipeline = redis.pipeline();
    for (const key of chunk) pipeline.del(key);
    await pipeline.exec();
  }
}

export const getCacheStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_READ))
  .query(async () => {
    const redis = getRedisClient();

    // Use targeted INFO sections — redis.info("all") exposes requirepass,
    // masterauth, and replication config which must never reach the browser.
    // NOTE: connected_clients lives in "clients" section, NOT "server".
    const [memInfo, statsInfo, serverInfo, clientsInfo, cacheKeys, rateLimitKeys] =
      await Promise.all([
        redis.info("memory"),
        redis.info("stats"),
        redis.info("server"),
        redis.info("clients"),
        scanKeys(redis, "cache:*"),
        scanKeys(redis, "ratelimit:*"),
      ]);

    const info = `${memInfo}\n${statsInfo}\n${serverInfo}\n${clientsInfo}`;
    const match = (pattern: RegExp) => info.match(pattern)?.[1]?.trim() ?? null;

    const hits = Number(match(/keyspace_hits:(\d+)/) ?? 0);
    const misses = Number(match(/keyspace_misses:(\d+)/) ?? 0);
    const total = hits + misses;

    // Group cache keys by sub-namespace for per-row counts in the UI
    const keysByNamespace: Record<string, number> = {};
    for (const key of cacheKeys) {
      // e.g. "cache:settings:all" → "settings"
      const ns = key.split(":")[1] ?? "other";
      keysByNamespace[ns] = (keysByNamespace[ns] ?? 0) + 1;
    }

    return {
      redis: {
        memoryUsed: match(/used_memory_human:(.+)/) ?? "N/A",
        version: match(/redis_version:(.+)/) ?? "N/A",
        uptimeSeconds: Number(match(/uptime_in_seconds:(\d+)/) ?? 0),
        connectedClients: Number(match(/connected_clients:(\d+)/) ?? 0),
        hitRate: total > 0 ? Math.round((hits / total) * 100) : null,
        hits,
        misses,
      },
      namespaces: {
        cache: cacheKeys.length,
        rateLimit: rateLimitKeys.length,
        byNamespace: keysByNamespace,
      },
    };
  });

export const clearCacheNamespace = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .use(auditLog({ module: "system", action: "CLEAR_CACHE", entityType: "Cache" }))
  .input(
    z.object({
      namespace: z.enum(["all", "settings", "category", "permissions", "ratelimit"]),
    }),
  )
  .mutation(async ({ input }) => {
    const redis = getRedisClient();
    const { namespace } = input;

    // Clear in-process MemoryCache instances (process-local; does not affect
    // other cluster nodes — acceptable for single-VPS deployment)
    if (namespace === "all" || namespace === "settings") settingsCache.clear();
    if (namespace === "all" || namespace === "category") categoryCache.clear();
    if (namespace === "all" || namespace === "permissions") permissionsCache.clear();

    // Scan + delete Redis keys non-blockingly, in 500-key pipeline chunks
    const pattern = CACHE_NAMESPACE_PATTERNS[namespace];
    let cleared = 0;
    if (pattern) {
      const keys = await scanKeys(redis, pattern);
      await deleteKeys(redis, keys);
      cleared = keys.length;
    }

    return { namespace, cleared };
  });

// ─── Workflow ───────────────────────

export const getWorkflowTransitions = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(z.object({ currentStatus: z.string().min(1) }))
  .query(async ({ input }) => {
    const { getWorkflowService } = await import("@ecom/features/workflow/services/WorkflowService");
    const wf = getWorkflowService();
    return {
      currentStatus: input.currentStatus,
      availableTransitions: wf.getAvailableTransitions(input.currentStatus as "DRAFT"),
    };
  });

export const getWorkflowDescription = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .query(async () => {
    const { getWorkflowService } = await import("@ecom/features/workflow/services/WorkflowService");
    return getWorkflowService().getWorkflowDescription();
  });

export const getQueueDashboardUrl = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .query(async ({ ctx }) => {
    const ssoToken = signQueueDashboardToken({
      userId: ctx.user.id,
      email: ctx.user.email,
    });
    const apiUrl = process.env.API_URL ?? "http://localhost:4000";
    return {
      url: `${apiUrl}/api/v1/queues/sso?token=${ssoToken}`,
    };
  });

// ─── Developer Diagnostics & Database Maintenance Procedures (Non-Production Only) ───

import { Writable } from "node:stream";

class MemoryWriteStream extends Writable {
  public data = "";
  override _write(chunk: unknown, _encoding: string, callback: (error?: Error | null) => void) {
    this.data += (chunk as string | Buffer).toString("utf8");
    callback();
  }
}

export const listLogFiles = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .query(async () => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().listLogFiles();
  });

export const getProcessStatus = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().getProcessStatus({
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });

export const executeProcessAction = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      action: z.enum(["restart", "stop", "reload"]),
      target: z.string().min(1),
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().executeProcessAction({
      action: input.action,
      target: input.target,
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });

export const pingServices = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().pingExternalServices({
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });

export const queryRedis = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      action: z.enum(["scan", "get", "del"]),
      pattern: z.string().optional(),
      key: z.string().optional(),
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().queryRedis({
      action: input.action,
      pattern: input.pattern,
      key: input.key,
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });

export const executeDbCommand = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      action: z.enum([
        "migrate-deploy",
        "migrate-reset",
        "migrate-status",
        "db-push",
        "validate",
        "generate",
        "seed",
      ]),
      seedOnly: z.string().optional(),
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { getDatabaseMaintenanceService } = await import(
      "@ecom/features/di/containers/DatabaseMaintenanceService"
    );
    const writeStream = new MemoryWriteStream();
    await getDatabaseMaintenanceService().executeCommand({
      action: input.action,
      maintenanceKey: input.maintenanceKey,
      sudoPassword: input.sudoPassword,
      seedOnly: input.seedOnly,
      userId: ctx.user.id,
      username: ctx.user.email,
      writeStream,
    });
    return {
      success: true,
      output: writeStream.data,
    };
  });

export const executeLogCommand = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      filename: z.string().optional(),
      lines: z.number().optional(),
      level: z.string().optional(),
      search: z.string().optional(),
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    const writeStream = new MemoryWriteStream();
    await getSystemDiagnosticsService().executeLogCommand({
      action: "read",
      filename: input.filename,
      lines: input.lines,
      level: input.level,
      search: input.search,
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      username: ctx.user.email,
      writeStream,
      maintenanceKey: input.maintenanceKey,
    });
    return {
      success: true,
      output: writeStream.data,
    };
  });

export const getLogLevel = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .query(async () => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().getLogLevel();
  });

export const updateLogLevel = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      level: z.string().min(1),
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().updateLogLevel({
      level: input.level,
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });

export const getDatabaseStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().getDatabaseStats({
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });

export const getRedisStats = authedProcedure
  .use(requirePermission(Permissions.SYSTEM_MANAGE))
  .input(
    z.object({
      sudoPassword: z.string().min(1),
      maintenanceKey: z.string().min(1),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { getSystemDiagnosticsService } = await import(
      "@ecom/features/di/containers/SystemDiagnosticsService"
    );
    return getSystemDiagnosticsService().getRedisStats({
      sudoPassword: input.sudoPassword,
      userId: ctx.user.id,
      maintenanceKey: input.maintenanceKey,
    });
  });
