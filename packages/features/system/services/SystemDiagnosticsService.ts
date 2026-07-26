import { execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import { join } from "node:path";
import readline from "node:readline";
import type { Writable } from "node:stream";
import { createGunzip } from "node:zlib";
import { isDevDiagnosticsBypassEnabled } from "@ecom/lib";
import { verifyPassword } from "@ecom/lib/crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import { getRedisClient } from "@ecom/lib/redis";
import type { PrismaClient } from "@ecom/prisma";

export interface ISystemDiagnosticsServiceDeps {
  prisma: PrismaClient;
}

export class SystemDiagnosticsService {
  private prisma: PrismaClient;

  constructor(deps: ISystemDiagnosticsServiceDeps) {
    this.prisma = deps.prisma;
  }

  /**
   * Helper to locate the monorepo root directory dynamically.
   */
  private findMonorepoRoot(): string {
    let dir = process.cwd();
    while (true) {
      const packageJsonPath = join(dir, "package.json");
      if (existsSync(packageJsonPath)) {
        try {
          const content = require("node:fs").readFileSync(packageJsonPath, "utf-8");
          if (content.includes('"workspaces"')) {
            return dir;
          }
        } catch {}
      }
      const parentDir = join(dir, "..");
      if (parentDir === dir) {
        break;
      }
      dir = parentDir;
    }
    return process.cwd();
  }

  /**
   * Helper to locate logs directory dynamically.
   */
  private getLogsDir(): string {
    const monorepoRoot = this.findMonorepoRoot();
    const logsDir = process.env.LOGS_PATH || join(monorepoRoot, "logs");
    if (!existsSync(logsDir)) {
      throw ErrorWithCode.Factory.NotFound("Logs directory does not exist on the server");
    }
    return logsDir;
  }

  /**
   * Strips ANSI escape codes from stdout/stderr chunks.
   */
  private stripAnsi(text: string): string {
    // biome-ignore lint: we use RegExp constructor to avoid control character warnings in literals
    const ansiRegex = new RegExp(
      "[\\u001b\\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]",
      "g",
    );
    return text.replace(ansiRegex, "");
  }

  /**
   * Masks sensitive credentials like passwords in connection URLs.
   */
  private maskSecrets(text: string): string {
    let masked = text.replace(/(postgres(?:ql)?:\/\/([^:]+):)([^@]+)(@)/g, "$1******$4");

    const key = process.env.SYSTEM_MAINTENANCE_KEY;
    if (key && key.length >= 8) {
      const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const keyRegex = new RegExp(escapedKey, "g");
      masked = masked.replace(keyRegex, "******");
    }
    return masked;
  }

  /**
   * Safely timing-safe compares the maintenance key.
   */
  private verifyMaintenanceKey(key?: string): void {
    if (isDevDiagnosticsBypassEnabled()) {
      return;
    }

    const envKey = process.env.SYSTEM_MAINTENANCE_KEY;
    if (!envKey) {
      throw ErrorWithCode.Factory.Forbidden(
        "SYSTEM_MAINTENANCE_KEY is not configured on the server. Command execution is disabled.",
      );
    }

    if (!key) {
      throw ErrorWithCode.Factory.Forbidden("Missing SYSTEM_MAINTENANCE_KEY");
    }

    const keyBuf = Buffer.from(key);
    const envKeyBuf = Buffer.from(envKey);

    if (keyBuf.length !== envKeyBuf.length || !crypto.timingSafeEqual(keyBuf, envKeyBuf)) {
      throw ErrorWithCode.Factory.Forbidden("Invalid SYSTEM_MAINTENANCE_KEY");
    }
  }

  private async verifySudoPassword(sudoPassword?: string, userId?: string): Promise<void> {
    if (isDevDiagnosticsBypassEnabled()) {
      return;
    }

    if (!sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }

    if (!userId) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing userId");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: {
          select: {
            hash: true,
          },
        },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }
  }

  /**
   * Lists log files matching the pattern app-YYYY-MM-DD.log.
   */
  async listLogFiles(): Promise<Array<{ filename: string; size: number; mtime: Date }>> {
    const logsDir = this.getLogsDir();
    const files = await readdir(logsDir);
    const logFiles = files.filter((f) => /^app-\d{4}-\d{2}-\d{2}\.log(?:\.gz)?$/.test(f));
    const result = [];
    for (const f of logFiles) {
      const s = await stat(join(logsDir, f));
      result.push({
        filename: f,
        size: s.size,
        mtime: s.mtime,
      });
    }
    return result.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  }

  /**
   * Executes tail log command (read/stream) with filtering.
   */
  async executeLogCommand(params: {
    action: "read" | "stream";
    filename?: string;
    lines?: number;
    level?: string;
    search?: string;
    sudoPassword?: string;
    userId: string;
    username: string;
    writeStream: Writable;
    maintenanceKey?: string;
  }): Promise<void> {
    const {
      action,
      filename,
      lines = 100,
      level,
      search,
      sudoPassword,
      userId,
      username,
      writeStream,
      maintenanceKey,
    } = params;

    // Production guard
    if (process.env.NODE_ENV === "production") {
      throw ErrorWithCode.Factory.Forbidden(
        "Diagnostics and log endpoints are strictly disabled on production environments.",
      );
    }

    // Verify key
    this.verifyMaintenanceKey(maintenanceKey);

    // Verify sudo password
    await this.verifySudoPassword(sudoPassword, userId);

    // Determine target log file
    const logsDir = this.getLogsDir();
    let targetFile = filename;
    if (!targetFile) {
      const files = await this.listLogFiles();
      const latestFile = files[0];
      if (!latestFile) {
        throw ErrorWithCode.Factory.NotFound("No log files found in logs directory");
      }
      targetFile = latestFile.filename; // Latest
    }

    // Prevent path traversal
    if (!/^app-\d{4}-\d{2}-\d{2}\.log(?:\.gz)?$/.test(targetFile)) {
      throw ErrorWithCode.Factory.BadRequest("Invalid log filename");
    }

    const filePath = join(logsDir, targetFile);
    if (!existsSync(filePath)) {
      throw ErrorWithCode.Factory.NotFound(`Log file ${targetFile} not found`);
    }

    writeStream.write(`▶ Reading Log File: ${targetFile}\n`);
    writeStream.write(`🧑 Requested by: ${username}\n`);
    writeStream.write(
      `🔍 Mode: ${action} | Lines: ${lines} | Level: ${level || "all"} | Search: ${search || "none"}\n`,
    );
    writeStream.write("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Decompress and read .gz compressed file on the fly
    if (targetFile.endsWith(".gz")) {
      if (action === "stream") {
        throw ErrorWithCode.Factory.BadRequest(
          "Streaming is not supported for compressed log files",
        );
      }

      return new Promise<void>((resolve, reject) => {
        const fileStream = createReadStream(filePath);
        const gunzip = createGunzip();
        const rl = readline.createInterface({
          input: fileStream.pipe(gunzip),
          crlfDelay: Infinity,
        });

        const matchedLines: string[] = [];

        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: line parser
        rl.on("line", (line: string) => {
          if (!line.trim()) return;

          let parsedLog: Record<string, unknown> | null = null;
          try {
            parsedLog = JSON.parse(line) as Record<string, unknown>;
          } catch {}

          if (parsedLog) {
            if (level && parsedLog.level !== level.toUpperCase()) {
              return;
            }
            if (search) {
              const regex = new RegExp(search, "i");
              const contentToSearch = `${parsedLog.message || ""} ${JSON.stringify(parsedLog)}`;
              if (!regex.test(contentToSearch)) {
                return;
              }
            }
          } else {
            if (level) return;
            if (search) {
              const regex = new RegExp(search, "i");
              if (!regex.test(line)) {
                return;
              }
            }
          }

          const cleanLine = `${this.maskSecrets(this.stripAnsi(line))}\n`;
          matchedLines.push(cleanLine);
        });

        rl.on("close", () => {
          const lastLines = matchedLines.slice(-lines);
          for (const cleanLine of lastLines) {
            writeStream.write(cleanLine);
          }
          writeStream.write("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
          writeStream.write("🎉 Log reading ended.\n");
          resolve();
        });

        fileStream.on("error", (err: Error) => {
          writeStream.write(`\n❌ Failed to read compressed log: ${err.message}\n`);
          reject(err);
        });
        gunzip.on("error", (err: Error) => {
          writeStream.write(`\n❌ Failed to decompress log: ${err.message}\n`);
          reject(err);
        });
      });
    }

    // Spawn tail process for normal raw logs
    const cmdArgs = ["-n", String(lines)];
    if (action === "stream") {
      cmdArgs.push("-f");
    }
    cmdArgs.push(filePath);

    return new Promise<void>((resolve, reject) => {
      const child = spawn("tail", cmdArgs, { shell: false });

      // Clean up tail process on client disconnect
      const onDisconnect = () => {
        child.kill();
        resolve();
      };
      writeStream.on("close", onDisconnect);

      let buffer = "";
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: log line processor
      const processChunk = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (const line of parts) {
          if (!line.trim()) continue;

          // Parse JSON log line to apply filters
          let parsedLog: ({ level?: string; message?: string } & Record<string, unknown>) | null =
            null;
          try {
            parsedLog = JSON.parse(line);
          } catch {
            // Raw text line
          }

          if (parsedLog) {
            // Level Filter
            if (level && parsedLog.level !== level.toUpperCase()) {
              continue;
            }
            // Search filter
            if (search) {
              const regex = new RegExp(search, "i");
              const contentToSearch = `${parsedLog.message || ""} ${JSON.stringify(parsedLog)}`;
              if (!regex.test(contentToSearch)) {
                continue;
              }
            }
          } else {
            // Raw text line filtering
            if (level) continue;
            if (search) {
              const regex = new RegExp(search, "i");
              if (!regex.test(line)) {
                continue;
              }
            }
          }

          const cleanLine = `${this.maskSecrets(this.stripAnsi(line))}\n`;
          writeStream.write(cleanLine);
        }
      };

      child.stdout.on("data", processChunk);
      child.stderr.on("data", processChunk);

      child.on("error", (err) => {
        writeStream.write(`\n❌ Log tail failed: ${err.message}\n`);
        writeStream.off("close", onDisconnect);
        reject(err);
      });

      child.on("close", (code) => {
        writeStream.off("close", onDisconnect);
        writeStream.write("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        if (code === 0 || code === null) {
          writeStream.write("🎉 Log reading ended.\n");
        } else {
          writeStream.write(`❌ Process exited with code ${code}\n`);
        }
        resolve();
      });
    });
  }

  /**
   * Retrieves PM2 processes details, or falls back to system status metrics.
   */
  async getProcessStatus(params: {
    sudoPassword?: string;
    userId: string;
    maintenanceKey?: string;
  }): Promise<unknown> {
    const { sudoPassword, userId, maintenanceKey } = params;

    // Production guard
    if (process.env.NODE_ENV === "production") {
      throw ErrorWithCode.Factory.Forbidden(
        "Diagnostics and process endpoints are strictly disabled on production environments.",
      );
    }

    // Verify key
    this.verifyMaintenanceKey(maintenanceKey);

    // Verify sudo password
    await this.verifySudoPassword(sudoPassword, userId);

    const { promisify } = require("node:util");
    const execFileAsync = promisify(execFile);

    try {
      const { stdout } = await execFileAsync("pm2", ["jlist"], { shell: false });
      const pm2List = JSON.parse(stdout);
      return {
        manager: "pm2",
        processes: pm2List.map(
          (proc: {
            name?: string;
            pid?: number;
            pm_id?: number;
            pm2_env?: {
              status?: string;
              pm_uptime?: number;
              restart_time?: number;
            };
            monit?: {
              cpu?: number;
              memory?: number;
            };
          }) => ({
            name: proc.name,
            pid: proc.pid,
            pm_id: proc.pm_id,
            status: proc.pm2_env?.status,
            uptime: proc.pm2_env?.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : 0,
            restarts: proc.pm2_env?.restart_time || 0,
            cpu: proc.monit?.cpu || 0,
            memory: proc.monit?.memory || 0,
          }),
        ),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      return {
        manager: "os_fallback",
        message: `PM2 is not running or not found: ${errorMessage}`,
        system: {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch(),
          uptime: os.uptime(),
          cpus: os.cpus().length,
          loadavg: os.loadavg(),
          memory: {
            totalBytes: totalMem,
            freeBytes: freeMem,
            usedBytes: totalMem - freeMem,
            usagePercentage: ((totalMem - freeMem) / totalMem) * 100,
          },
          processMemory: process.memoryUsage(),
        },
      };
    }
  }

  /**
   * Pings a whitelisted set of critical servers and external gateways.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ping orchestrator
  async pingExternalServices(params: {
    sudoPassword?: string;
    userId: string;
    maintenanceKey?: string;
  }): Promise<unknown> {
    const { sudoPassword, userId, maintenanceKey } = params;

    // Production guard
    if (process.env.NODE_ENV === "production") {
      throw ErrorWithCode.Factory.Forbidden(
        "Diagnostics endpoints are strictly disabled on production environments.",
      );
    }

    // Verify key
    this.verifyMaintenanceKey(maintenanceKey);

    // Verify sudo password
    if (!sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: {
          select: {
            hash: true,
          },
        },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }

    const targets: Array<{ name: string; host: string; port: number }> = [];

    // Parse Database URL
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const parsed = new URL(dbUrl);
        targets.push({
          name: "Database (PostgreSQL)",
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : 5432,
        });
      } catch {
        const match = dbUrl.match(/@([^:/]+)(?::(\d+))?/);
        if (match?.[1]) {
          targets.push({
            name: "Database (PostgreSQL)",
            host: match[1],
            port: match[2] ? parseInt(match[2], 10) : 5432,
          });
        }
      }
    }

    // Parse Redis URL
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const parsed = new URL(redisUrl);
        targets.push({
          name: "Redis Cache",
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        });
      } catch {
        const match = redisUrl.match(/(?:redis:\/\/)?([^:/]+)(?::(\d+))?/);
        if (match?.[1]) {
          targets.push({
            name: "Redis Cache",
            host: match[1],
            port: match[2] ? parseInt(match[2], 10) : 6379,
          });
        }
      }
    }

    // SMTP Mailer
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    if (smtpHost) {
      targets.push({
        name: "SMTP Mail Server",
        host: smtpHost,
        port: smtpPort ? parseInt(smtpPort, 10) : 587,
      });
    }

    // Fixed whitelisted endpoints
    targets.push({
      name: "GitHub API Gateway",
      host: "api.github.com",
      port: 443,
    });
    targets.push({
      name: "Google Public DNS",
      host: "8.8.8.8",
      port: 53,
    });

    const results = [];
    const checkConnection = (t: { name: string; host: string; port: number }) => {
      return new Promise<unknown>((resolve) => {
        const socket = new net.Socket();
        const start = Date.now();
        let isResolved = false;

        socket.setTimeout(2000); // 2-second timeout

        socket.connect(t.port, t.host, () => {
          const latency = Date.now() - start;
          socket.destroy();
          isResolved = true;
          resolve({
            name: t.name,
            host: t.host,
            port: t.port,
            status: "reachable",
            latencyMs: latency,
          });
        });

        const onError = (err: Error) => {
          if (isResolved) return;
          socket.destroy();
          isResolved = true;
          resolve({
            name: t.name,
            host: t.host,
            port: t.port,
            status: "unreachable",
            error: err.message,
          });
        };

        socket.on("error", onError);
        socket.on("timeout", () => onError(new Error("Connection timeout")));
      });
    };

    for (const t of targets) {
      results.push(await checkConnection(t));
    }

    return results;
  }

  /**
   * Scans, reads, or deletes cache keys under whitelisted namespaces.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: redis query engine
  async queryRedis(params: {
    action: "scan" | "get" | "del";
    pattern?: string;
    key?: string;
    sudoPassword?: string;
    userId: string;
    maintenanceKey?: string;
  }): Promise<unknown> {
    const { action, pattern, key, sudoPassword, userId, maintenanceKey } = params;

    // Production guard
    if (process.env.NODE_ENV === "production") {
      throw ErrorWithCode.Factory.Forbidden(
        "Diagnostics and Redis endpoints are strictly disabled on production environments.",
      );
    }

    // Verify key
    this.verifyMaintenanceKey(maintenanceKey);

    // Verify sudo password
    if (!sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: {
          select: {
            hash: true,
          },
        },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }

    const redis = getRedisClient();

    // ── SCAN Action ─────────────────────────────────
    if (action === "scan") {
      const matchPattern = pattern || "cache:*";

      const isWhitelisted =
        matchPattern.startsWith("cache:") || matchPattern.startsWith("ratelimit:");

      if (!isWhitelisted) {
        throw ErrorWithCode.Factory.Forbidden(
          "Redis operations are restricted to namespaces starting with 'cache:' or 'ratelimit:'.",
        );
      }

      let cursor = "0";
      const keys: string[] = [];
      try {
        const [nextCursor, scannedKeys] = await redis.scan(
          cursor,
          "MATCH",
          matchPattern,
          "COUNT",
          "100",
        );
        cursor = nextCursor;
        keys.push(...scannedKeys);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw ErrorWithCode.Factory.Internal(`Redis SCAN failed: ${errorMessage}`);
      }

      return {
        pattern: matchPattern,
        keysCount: keys.length,
        nextCursor: cursor,
        keys,
      };
    }

    // ── GET & DEL Action ─────────────────────────────
    if (!key) {
      throw ErrorWithCode.Factory.BadRequest("Missing key parameter");
    }

    const isWhitelisted = key.startsWith("cache:") || key.startsWith("ratelimit:");

    if (!isWhitelisted) {
      throw ErrorWithCode.Factory.Forbidden(
        "Redis operations are restricted to keys starting with 'cache:' or 'ratelimit:'.",
      );
    }

    if (action === "get") {
      try {
        const keyType = await redis.type(key);
        if (keyType === "none") {
          return { key, type: "none", value: null };
        }

        let rawValue: string | Record<string, string> | null = null;
        if (keyType === "string") {
          rawValue = await redis.get(key);
        } else if (keyType === "hash") {
          rawValue = await redis.hgetall(key);
        } else {
          const size =
            keyType === "list"
              ? await redis.llen(key)
              : keyType === "set"
                ? await redis.scard(key)
                : keyType === "zset"
                  ? await redis.zcard(key)
                  : 0;
          return { key, type: keyType, value: `[Non-string data type, Size: ${size}]` };
        }

        let formattedValue =
          typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);
        if (formattedValue.length > 10000) {
          formattedValue = `${formattedValue.substring(0, 10000)}\n... [TRUNCATED]`;
        }

        return {
          key,
          type: keyType,
          value: keyType === "hash" ? rawValue : formattedValue,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw ErrorWithCode.Factory.Internal(`Failed to get Redis key: ${errorMessage}`);
      }
    }

    if (action === "del") {
      try {
        const deletedCount = await redis.del(key);
        return {
          key,
          deleted: deletedCount > 0,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw ErrorWithCode.Factory.Internal(`Failed to delete Redis key: ${errorMessage}`);
      }
    }

    throw ErrorWithCode.Factory.BadRequest(`Unsupported action: ${action}`);
  }

  /**
   * Executes PM2 process actions (restart/stop/reload) on non-production.
   */
  async executeProcessAction(params: {
    action: "restart" | "stop" | "reload";
    target: string;
    sudoPassword?: string;
    userId: string;
    maintenanceKey?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { action, target, sudoPassword, userId, maintenanceKey } = params;

    // Production guard
    if (process.env.NODE_ENV === "production") {
      throw ErrorWithCode.Factory.Forbidden(
        "Diagnostics and process endpoints are strictly disabled on production environments.",
      );
    }

    // Verify key
    this.verifyMaintenanceKey(maintenanceKey);

    // Verify sudo password
    if (!sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: {
          select: {
            hash: true,
          },
        },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }

    // Validate target input to prevent argument injection
    if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
      throw ErrorWithCode.Factory.BadRequest("Invalid process name or ID parameter");
    }

    const { promisify } = require("node:util");
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync("pm2", [action, target], { shell: false });
      return {
        success: true,
        message: `Successfully executed pm2 ${action} on target: ${target}`,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw ErrorWithCode.Factory.Internal(`Failed to execute PM2 action: ${errorMessage}`);
    }
  }

  async getLogLevel(): Promise<{ level: string }> {
    const { getLogLevel } = require("@ecom/lib/logger");
    return { level: getLogLevel() };
  }

  async updateLogLevel(params: {
    level: string;
    sudoPassword?: string;
    userId: string;
    maintenanceKey: string;
  }): Promise<{ success: boolean; oldLevel: string; newLevel: string }> {
    this.verifyMaintenanceKey(params.maintenanceKey);

    if (!params.sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        password: { select: { hash: true } },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(params.sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }

    const newLevel = params.level.toLowerCase();
    if (!["debug", "info", "warn", "error"].includes(newLevel)) {
      throw ErrorWithCode.Factory.BadRequest("Invalid log level");
    }

    const { getLogLevel, setLogLevel } = require("@ecom/lib/logger");
    const oldLevel = getLogLevel();
    setLogLevel(newLevel);

    return {
      success: true,
      oldLevel,
      newLevel,
    };
  }

  async getDatabaseStats(params: {
    sudoPassword?: string;
    userId: string;
    maintenanceKey: string;
  }): Promise<{
    databaseSizeBytes: number;
    tables: Array<{
      tableName: string;
      rowCount: number;
      totalSizeBytes: number;
      tableSizeBytes: number;
      indexSizeBytes: number;
    }>;
  }> {
    this.verifyMaintenanceKey(params.maintenanceKey);

    if (!params.sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        password: { select: { hash: true } },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(params.sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }

    try {
      const dbSizeResult = await this.prisma.$queryRawUnsafe<Array<{ databaseSizeBytes: string }>>(`
        SELECT pg_database_size(current_database())::bigint AS "databaseSizeBytes"
      `);
      const databaseSizeBytes = Number(dbSizeResult?.[0]?.databaseSizeBytes ?? 0);

      const tablesResult = await this.prisma.$queryRawUnsafe<
        Array<{
          tableName: string;
          rowCount: string;
          totalSizeBytes: string;
          tableSizeBytes: string;
          indexSizeBytes: string;
        }>
      >(`
        SELECT
          c.relname AS "tableName",
          c.reltuples::bigint AS "rowCount",
          pg_total_relation_size(c.oid)::bigint AS "totalSizeBytes",
          pg_relation_size(c.oid)::bigint AS "tableSizeBytes",
          (pg_total_relation_size(c.oid) - pg_relation_size(c.oid))::bigint AS "indexSizeBytes"
        FROM pg_class c
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
        ORDER BY pg_total_relation_size(c.oid) DESC
      `);

      const tables = tablesResult.map((t) => ({
        tableName: t.tableName,
        rowCount: Number(t.rowCount),
        totalSizeBytes: Number(t.totalSizeBytes),
        tableSizeBytes: Number(t.tableSizeBytes),
        indexSizeBytes: Number(t.indexSizeBytes),
      }));

      return {
        databaseSizeBytes,
        tables,
      };
    } catch (err: unknown) {
      const error = err as Error;
      throw ErrorWithCode.Factory.Internal(`Database sizing query failed: ${error.message}`);
    }
  }

  async getRedisStats(params: {
    sudoPassword?: string;
    userId: string;
    maintenanceKey: string;
  }): Promise<{
    memory: Record<string, string>;
    stats: Record<string, string>;
    keysSummary: Array<{ pattern: string; count: number }>;
  }> {
    this.verifyMaintenanceKey(params.maintenanceKey);

    if (!params.sudoPassword) {
      throw ErrorWithCode.Factory.InvalidCredentials("Missing sudoPassword");
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        password: { select: { hash: true } },
      },
    });
    const hash = dbUser?.password?.hash;
    if (!hash) {
      throw ErrorWithCode.Factory.InvalidCredentials("User password hash not found");
    }
    const isPasswordValid = await verifyPassword(params.sudoPassword, hash);
    if (!isPasswordValid) {
      throw ErrorWithCode.Factory.InvalidCredentials("Invalid sudo password");
    }

    try {
      const { getRedisClient } = require("@ecom/lib/redis");
      const redis = getRedisClient();

      const infoMemoryRaw = await redis.info("memory");
      const infoStatsRaw = await redis.info("stats");

      const parseInfo = (raw: string): Record<string, string> => {
        const parsed: Record<string, string> = {};
        for (const line of raw.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf(":");
          if (idx !== -1) {
            parsed[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
          }
        }
        return parsed;
      };

      const memory = parseInfo(infoMemoryRaw);
      const stats = parseInfo(infoStatsRaw);

      const getKeysCount = async (pattern: string): Promise<number> => {
        let count = 0;
        let cursor = "0";
        do {
          const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
          cursor = nextCursor;
          count += keys.length;
        } while (cursor !== "0");
        return count;
      };

      const keysSummary = [
        { pattern: "cache:*", count: await getKeysCount("cache:*") },
        { pattern: "ratelimit:*", count: await getKeysCount("ratelimit:*") },
        { pattern: "*", count: await redis.dbsize() },
      ];

      return {
        memory,
        stats,
        keysSummary,
      };
    } catch (err: unknown) {
      const error = err as Error;
      throw ErrorWithCode.Factory.Internal(`Redis stats profiler failed: ${error.message}`);
    }
  }
}
