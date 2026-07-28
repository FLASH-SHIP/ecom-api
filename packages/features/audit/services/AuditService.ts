import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";
import type { PrismaClient } from "@ecom/prisma";
import { loggerContext, maskSensitiveData } from "@flash-ship/ecom-lib/logger";
import type { AuditLogFilters, AuditLogRepository } from "../repositories/AuditLogRepository";
import type { RequestLogFilters, RequestLogRepository } from "../repositories/RequestLogRepository";

const execFileAsync = promisify(execFile);

export interface IAuditServiceDeps {
  auditLogRepo: AuditLogRepository;
  requestLogRepo: RequestLogRepository;
  prisma: PrismaClient;
}

export class AuditService {
  private deps: IAuditServiceDeps;
  constructor(deps: IAuditServiceDeps) {
    this.deps = deps;
  }

  // ─── Audit Logs ───────────────────────────────────

  async logAction(data: {
    userId?: string;
    action: string;
    module: string;
    entityId?: string;
    entityType?: string;
    oldValues?: unknown;
    newValues?: unknown;
    ipAddress?: string;
    userAgent?: string;
    metadata?: unknown;
  }) {
    const traceId = loggerContext.getStore()?.traceId;
    let finalMetadata = data.metadata;

    if (traceId) {
      if (finalMetadata && typeof finalMetadata === "object") {
        finalMetadata = { ...(finalMetadata as Record<string, unknown>), traceId };
      } else {
        finalMetadata = { traceId };
      }
    }

    const maskedOldValues = data.oldValues ? maskSensitiveData(data.oldValues) : undefined;
    const maskedNewValues = data.newValues ? maskSensitiveData(data.newValues) : undefined;
    const maskedMetadata = finalMetadata ? maskSensitiveData(finalMetadata) : undefined;

    return this.deps.auditLogRepo.create({
      ...data,
      oldValues: maskedOldValues ?? undefined,
      newValues: maskedNewValues ?? undefined,
      metadata: maskedMetadata ?? undefined,
    });
  }

  async getAuditLogs(filters: AuditLogFilters, page?: number, perPage?: number) {
    return this.deps.auditLogRepo.findMany(filters, page, perPage);
  }

  async getAuditLog(id: number) {
    return this.deps.auditLogRepo.findById(id);
  }

  async getAuditStats() {
    return this.deps.auditLogRepo.getStats();
  }

  async deleteAuditLog(id: number) {
    return this.deps.auditLogRepo.deleteById(id);
  }

  async purgeAllAuditLogs() {
    const keepLatest = process.env.LOG_PURGE_AUDIT_KEEP_LATEST !== "false";
    return this.deps.auditLogRepo.deleteAll(keepLatest);
  }

  async purgeAuditLogs(olderThanDays: number) {
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);
    const keepLatest = process.env.LOG_PURGE_AUDIT_KEEP_LATEST !== "false";
    return this.deps.auditLogRepo.deleteOlderThan(date, keepLatest);
  }

  // ─── Request Logs ─────────────────────────────────

  async logRequest(data: {
    userId?: string;
    method: string;
    url: string;
    statusCode?: number;
    duration?: number;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    metadata?: unknown;
  }) {
    return this.deps.requestLogRepo.create(data);
  }

  async getRequestLogs(filters: RequestLogFilters, page?: number, perPage?: number) {
    return this.deps.requestLogRepo.findMany(filters, page, perPage);
  }

  async getRequestStats() {
    return this.deps.requestLogRepo.getStats();
  }

  async purgeRequestLogs(olderThanDays: number) {
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);
    return this.deps.requestLogRepo.deleteOlderThan(date);
  }

  async deleteRequestLog(id: number) {
    return this.deps.requestLogRepo.deleteById(id);
  }

  // ─── System Info ──────────────────────────────────

  // Cache slow I/O results (disk, osRelease, DB, Redis) for 30 seconds.
  // Real-time metrics (memory, uptime, load avg) are always computed fresh.
  private _systemInfoCache: {
    disk: { total: number; used: number; free: number; mountpoint: string } | null;
    osRelease: string | null;
    database: { ok: boolean; latencyMs: number | null };
    redis: { ok: boolean; latencyMs: number | null; usedMemory: string | null };
    cachedAt: number;
  } | null = null;

  // Deduplicates concurrent cache-miss requests — all callers await the same refresh Promise.
  private _inflightRefresh: Promise<void> | null = null;

  private readonly SYSTEM_INFO_TTL_MS = 30_000;

  async getSystemInfo() {
    const now = Date.now();
    const isCacheValid =
      this._systemInfoCache && now - this._systemInfoCache.cachedAt < this.SYSTEM_INFO_TTL_MS;

    // ── Slow I/O — deduplicated refresh, all concurrent callers share one Promise ──
    if (!isCacheValid) {
      if (!this._inflightRefresh) {
        this._inflightRefresh = Promise.all([
          this._getDisk(),
          this._getOsRelease(),
          this._pingDatabase(),
          this._pingRedis(),
        ])
          .then(([disk, osRelease, database, redis]) => {
            this._systemInfoCache = { disk, osRelease, database, redis, cachedAt: Date.now() };
            this._inflightRefresh = null;
          })
          .catch(() => {
            // Don't leave inflight dangling on error
            this._inflightRefresh = null;
          });
      }
      await this._inflightRefresh;
    }

    // biome-ignore lint/style/noNonNullAssertion: set above
    const cached = this._systemInfoCache!;

    // ── Real-time metrics (always fresh) ─────────────────────────────
    const cpus = os.cpus();

    return {
      // Runtime
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV ?? "development",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hostname: os.hostname(),
      // Uptime
      processUptime: process.uptime(),
      systemUptime: os.uptime(),
      // Node memory (always fresh)
      memoryUsage: process.memoryUsage(),
      // System memory (always fresh)
      system: {
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        cpuModel: cpus[0]?.model?.trim() ?? "Unknown",
        cpuCores: cpus.length,
        loadAvg: os.loadavg() as [number, number, number],
      },
      // Cached slow I/O
      disk: cached.disk,
      osRelease: cached.osRelease,
      database: cached.database,
      redis: cached.redis,
    };
  }

  private async _getDisk(): Promise<{
    total: number;
    used: number;
    free: number;
    mountpoint: string;
  } | null> {
    try {
      const { stdout } = await execFileAsync("df", ["-B1", "/"], { timeout: 2000 });
      const lines = stdout.trim().split("\n");
      const parts = lines[1]?.split(/\s+/);
      if (parts && parts.length >= 6) {
        return {
          total: Number(parts[1]),
          used: Number(parts[2]),
          free: Number(parts[3]),
          mountpoint: parts[5] ?? "/",
        };
      }
    } catch {
      // Windows, permission denied, or timeout
    }
    return null;
  }

  private async _getOsRelease(): Promise<string | null> {
    try {
      const content = await readFile("/etc/os-release", "utf-8");
      const prettyLine = content.split("\n").find((l) => l.startsWith("PRETTY_NAME="));
      if (prettyLine) {
        return prettyLine
          .replace(/^PRETTY_NAME=/, "")
          .replace(/"/g, "")
          .trim();
      }
    } catch {
      // Not Linux or file not found
    }
    return null;
  }

  private async _pingDatabase(): Promise<{ ok: boolean; latencyMs: number | null }> {
    try {
      const t0 = Date.now();
      await this.deps.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - t0 };
    } catch {
      return { ok: false, latencyMs: null };
    }
  }

  private async _pingRedis(): Promise<{
    ok: boolean;
    latencyMs: number | null;
    usedMemory: string | null;
  }> {
    try {
      const { getRedisClient } = await import("@flash-ship/ecom-lib/redis");
      const redis = getRedisClient();
      const t0 = Date.now();
      await redis.ping();
      const latencyMs = Date.now() - t0;
      const info = await redis.info("memory");
      const match = info.match(/used_memory_human:(\S+)/);
      return { ok: true, latencyMs, usedMemory: match?.[1] ?? null };
    } catch {
      return { ok: false, latencyMs: null, usedMemory: null };
    }
  }
}
