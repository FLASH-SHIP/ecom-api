import { execFile, spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import net from "node:net";
import { Writable } from "node:stream";
import { verifyPassword } from "@ecom/lib/crypto";
import { getRedisClient } from "@ecom/lib/redis";
import type { PrismaClient } from "@ecom/prisma";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemDiagnosticsService } from "../services/SystemDiagnosticsService";

// Mock node:fs with fallback to original implementation
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn((path: string) => {
      if (path.endsWith(".gz") || path.includes("logs")) return true;
      return actual.existsSync(path);
    }),
    createReadStream: vi.fn((path: string, options?: unknown) => {
      if (path.endsWith(".gz")) {
        const { Readable } = require("node:stream");
        return Readable.from(["line1\nline2\nline3\n"]);
      }
      return actual.createReadStream(
        path,
        options as Parameters<typeof actual.createReadStream>[1],
      );
    }),
  };
});

// Mock node:zlib with fallback to original implementation
vi.mock("node:zlib", async () => {
  const actual = await vi.importActual<typeof import("node:zlib")>("node:zlib");
  return {
    ...actual,
    createGunzip: vi.fn(() => {
      const { PassThrough } = require("node:stream");
      return new PassThrough();
    }),
  };
});

// Mock child_process spawn & execFile
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
  execFile: vi.fn(),
}));

// Mock verifyPassword
vi.mock("@ecom/lib/crypto", () => ({
  verifyPassword: vi.fn(),
}));

// Mock Redis client
vi.mock("@ecom/lib/redis", () => {
  const mockRedis = {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(() => Promise.resolve(["0", []])),
    type: vi.fn(),
    hgetall: vi.fn(),
    llen: vi.fn(),
    scard: vi.fn(),
    zcard: vi.fn(),
    info: vi.fn((section?: string) => {
      if (section === "memory") {
        return Promise.resolve("used_memory:1048576\nused_memory_human:1.00M");
      }
      return Promise.resolve("evicted_keys:0\nkeyspace_hits:100\nkeyspace_misses:20");
    }),
    dbsize: vi.fn(() => Promise.resolve(42)),
  };
  return {
    getRedisClient: vi.fn(() => mockRedis),
  };
});

// Mock fs/promises readdir & stat
vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

// Mock net.Socket
vi.mock("node:net", () => {
  const mockSocket = {
    setTimeout: vi.fn(),
    connect: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
  };
  return {
    default: {
      Socket: vi.fn(() => mockSocket),
    },
    Socket: vi.fn(() => mockSocket),
  };
});

describe("SystemDiagnosticsService", () => {
  let service: SystemDiagnosticsService;
  let mockPrisma: PrismaClient;
  let mockRedis: Record<string, Mock>;
  let writeStream: MockWriteStream;

  class MockWriteStream extends Writable {
    public data = "";
    override _write(chunk: unknown, _encoding: string, callback: (error?: Error | null) => void) {
      this.data += (chunk as string | Buffer).toString();
      callback();
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaClient;
    mockRedis = getRedisClient() as unknown as Record<string, Mock>;
    service = new SystemDiagnosticsService({ prisma: mockPrisma });
    writeStream = new MockWriteStream();

    // Default development env setup
    process.env.NODE_ENV = "development";
    process.env.SYSTEM_MAINTENANCE_KEY = "test_maintenance_key_value_12345";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.SMTP_HOST = "localhost";
    process.env.SMTP_PORT = "587";

    // Setup default successful password verification
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      password: { hash: "hashed_password" },
    } as unknown as Awaited<ReturnType<typeof mockPrisma.user.findUnique>>);
    vi.mocked(verifyPassword).mockResolvedValue(true);
  });

  describe("Log Viewer Features", () => {
    it("should list log files sorted by modified time", async () => {
      vi.mocked(readdir).mockResolvedValue([
        "app-2026-07-14.log",
        "app-2026-07-15.log",
        "other.txt",
      ] as unknown as never);
      vi.mocked(stat).mockImplementation((path: import("node:fs").PathLike) => {
        const pathStr = String(path);
        const time = pathStr.includes("2026-07-15")
          ? new Date("2026-07-15")
          : new Date("2026-07-14");
        return Promise.resolve({ size: 100, mtime: time } as unknown as Awaited<
          ReturnType<typeof stat>
        >);
      });

      const list = await service.listLogFiles();
      expect(list).toHaveLength(2);
      expect(list[0].filename).toBe("app-2026-07-15.log");
    });

    it("should execute read log file and filter by level", async () => {
      vi.mocked(readdir).mockResolvedValue(["app-2026-07-15.log"] as unknown as never);
      vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as unknown as Awaited<
        ReturnType<typeof stat>
      >);

      const mockChild = {
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === "data") {
              const log1 = JSON.stringify({ level: "INFO", message: "User logged in" });
              const log2 = JSON.stringify({ level: "ERROR", message: "Failed to connect" });
              cb(Buffer.from(`${log1}\n${log2}\n`));
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === "close") cb(0);
        }),
      };
      vi.mocked(spawn).mockReturnValue(mockChild as unknown as ReturnType<typeof spawn>);

      await service.executeLogCommand({
        action: "read",
        level: "error",
        sudoPassword: "correct_password",
        userId: "user_123",
        username: "test-dev@ecom.com",
        writeStream,
        maintenanceKey: "test_maintenance_key_value_12345",
      });

      expect(writeStream.data).toContain("Failed to connect");
      expect(writeStream.data).not.toContain("User logged in");
    });

    it("should prevent log file path traversal", async () => {
      await expect(
        service.executeLogCommand({
          action: "read",
          filename: "../invalid-traversal.log",
          sudoPassword: "correct_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
          maintenanceKey: "test_maintenance_key_value_12345",
        }),
      ).rejects.toThrowError(/Invalid log filename/);
    });
  });

  describe("Process Health Diagnostics", () => {
    it("should query process status using pm2 command if running", async () => {
      const pm2Json = JSON.stringify([
        {
          name: "ecom-api",
          pid: 1234,
          pm_id: 0,
          pm2_env: { status: "online", pm_uptime: Date.now() - 10000, restart_time: 2 },
          monit: { cpu: 12, memory: 50000000 },
        },
      ]);
      vi.mocked(execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          (
            callback as (
              err: Error | null,
              res: { stdout: string } | Record<string, unknown>,
            ) => void
          )(null, { stdout: pm2Json });
          return {} as unknown as ReturnType<typeof execFile>;
        },
      );

      const res = (await service.getProcessStatus({
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      })) as {
        manager: string;
        processes: Array<{ name: string; status: string }>;
      };

      expect(res.manager).toBe("pm2");
      expect(res.processes[0].name).toBe("ecom-api");
      expect(res.processes[0].status).toBe("online");
    });

    it("should fallback to reporting OS stats if PM2 is not installed", async () => {
      vi.mocked(execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
          (
            callback as (
              err: Error | null,
              res: { stdout: string } | Record<string, unknown>,
            ) => void
          )(new Error("Command not found"), {});
          return {} as unknown as ReturnType<typeof execFile>;
        },
      );

      const res = (await service.getProcessStatus({
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      })) as { manager: string; system: { memory: unknown } };

      expect(res.manager).toBe("os_fallback");
      expect(res.system.memory).toBeDefined();
    });
  });

  describe("External Service Connectivity", () => {
    it("should verify network connectivity successfully", async () => {
      const mockSocket = {
        setTimeout: vi.fn(),
        connect: vi.fn((_port: number, _host: string, cb: () => void) => {
          cb();
        }),
        destroy: vi.fn(),
        on: vi.fn(),
      };
      vi.mocked(net.Socket).mockReturnValue(mockSocket as unknown as net.Socket);

      const res = (await service.pingExternalServices({
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      })) as Array<{ status: string }>;

      expect(res).toBeInstanceOf(Array);
      expect(res[0].status).toBe("reachable");
    });
  });

  describe("Redis Query Engine", () => {
    it("should scan keys matching pattern under the whitelisted cache prefix", async () => {
      mockRedis.scan.mockResolvedValue(["0", ["cache:user:1", "cache:user:2"]]);

      const res = (await service.queryRedis({
        action: "scan",
        pattern: "cache:user:*",
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      })) as { keysCount: number; keys: string[] };

      expect(res.keysCount).toBe(2);
      expect(res.keys).toContain("cache:user:1");
    });

    it("should block Redis operations on non-whitelisted patterns", async () => {
      await expect(
        service.queryRedis({
          action: "scan",
          pattern: "bull:queue:*",
          sudoPassword: "correct_password",
          userId: "user_123",
          maintenanceKey: "test_maintenance_key_value_12345",
        }),
      ).rejects.toThrowError(/Redis operations are restricted/);
    });

    it("should return string values with truncation if exceeding limits", async () => {
      mockRedis.type.mockResolvedValue("string");
      mockRedis.get.mockResolvedValue("a".repeat(11000));

      const res = (await service.queryRedis({
        action: "get",
        key: "cache:large_item",
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      })) as { value: string };

      expect(res.value).toContain("[TRUNCATED]");
      expect(res.value.length).toBeLessThan(10200);
    });
  });

  describe("PM2 Process Control Actions", () => {
    it("should execute PM2 restart action successfully", async () => {
      vi.mocked(execFile).mockImplementation(
        (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
          (cb as (err: Error | null, res: { stdout: string } | Record<string, unknown>) => void)(
            null,
            { stdout: "success" },
          );
          return {} as unknown as ReturnType<typeof execFile>;
        },
      );

      const res = await service.executeProcessAction({
        action: "restart",
        target: "ecom-api",
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      });

      expect(res.success).toBe(true);
      expect(execFile).toHaveBeenCalledWith(
        "pm2",
        ["restart", "ecom-api"],
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("should block invalid process names to prevent argument injection", async () => {
      await expect(
        service.executeProcessAction({
          action: "restart",
          target: "ecom-api; rm -rf /",
          sudoPassword: "correct_password",
          userId: "user_123",
          maintenanceKey: "test_maintenance_key_value_12345",
        }),
      ).rejects.toThrowError(/Invalid process name/);
    });

    it("should decompress and read .gz logs on the fly", async () => {
      const writeStream = new MockWriteStream();

      await service.executeLogCommand({
        action: "read",
        filename: "app-2026-07-15.log.gz",
        lines: 2,
        sudoPassword: "correct_password",
        userId: "user_123",
        username: "testuser",
        writeStream,
        maintenanceKey: "test_maintenance_key_value_12345",
      });

      expect(writeStream.data).toContain("line2\nline3\n");
      expect(writeStream.data).not.toContain("line1\n");
    });
  });

  describe("Logger & Sizing Stats Diagnostics", () => {
    it("should get log level", async () => {
      const res = await service.getLogLevel();
      expect(res.level).toBeDefined();
    });

    it("should update log level", async () => {
      // Mock verifyPassword to return true
      vi.mocked(verifyPassword).mockResolvedValue(true);

      // Mock mockPrisma.user.findUnique
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        password: { hash: "hashed_password" },
      } as unknown as Awaited<ReturnType<typeof mockPrisma.user.findUnique>>);

      const res = await service.updateLogLevel({
        level: "error",
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      });

      expect(res.success).toBe(true);
      expect(res.newLevel).toBe("error");

      // Reset level to debug
      await service.updateLogLevel({
        level: "debug",
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      });
    });

    it("should retrieve database stats", async () => {
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        password: { hash: "hashed_password" },
      } as unknown as Awaited<ReturnType<typeof mockPrisma.user.findUnique>>);

      // Mock mockPrisma.$queryRawUnsafe
      const mockQueryRawUnsafe = vi.fn().mockImplementation((query: string) => {
        if (query.includes("pg_database_size")) {
          return Promise.resolve([{ databaseSizeBytes: "102400" }]);
        }
        return Promise.resolve([
          {
            tableName: "users",
            rowCount: "5",
            totalSizeBytes: "10240",
            tableSizeBytes: "8192",
            indexSizeBytes: "2048",
          },
        ]);
      });
      mockPrisma.$queryRawUnsafe =
        mockQueryRawUnsafe as unknown as typeof mockPrisma.$queryRawUnsafe;

      const res = await service.getDatabaseStats({
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      });

      expect(res.databaseSizeBytes).toBe(102400);
      expect(res.tables.length).toBe(1);
      const table = res.tables[0];
      expect(table).toBeDefined();
      if (table) {
        expect(table.tableName).toBe("users");
        expect(table.rowCount).toBe(5);
      }
    });

    it("should retrieve Redis memory profiling stats", async () => {
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
        password: { hash: "hashed_password" },
      } as unknown as Awaited<ReturnType<typeof mockPrisma.user.findUnique>>);

      const res = await service.getRedisStats({
        sudoPassword: "correct_password",
        userId: "user_123",
        maintenanceKey: "test_maintenance_key_value_12345",
      });

      expect(res.memory.used_memory).toBeDefined();
      expect(res.stats.evicted_keys).toBeDefined();
      expect(res.keysSummary.length).toBe(3);
    });
  });
});
