import { spawn } from "node:child_process";
import { Writable } from "node:stream";
import { verifyPassword } from "@ecom/lib/crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import { getRedisClient } from "@ecom/lib/redis";
import type { PrismaClient } from "@ecom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseMaintenanceService } from "../services/DatabaseMaintenanceService";

// Mock child_process spawn
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
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
  };
  return {
    getRedisClient: vi.fn(() => mockRedis),
  };
});

describe("DatabaseMaintenanceService", () => {
  let service: DatabaseMaintenanceService;
  let mockPrisma: PrismaClient;
  let mockRedis: any;
  let writeStream: MockWriteStream;
  let originalEnv: NodeJS.ProcessEnv;

  class MockWriteStream extends Writable {
    public data = "";
    override _write(chunk: any, _encoding: string, callback: (error?: Error | null) => void) {
      this.data += chunk.toString();
      callback();
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    originalEnv = { ...process.env };
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaClient;
    mockRedis = getRedisClient();
    service = new DatabaseMaintenanceService({ prisma: mockPrisma });
    writeStream = new MockWriteStream();

    // Default development env setup
    process.env.NODE_ENV = "development";
    process.env.SYSTEM_MAINTENANCE_KEY = "test_maintenance_key_value_12345";

    // Setup default successful password verification
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      password: { hash: "hashed_password" },
    } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
  });

  describe("executeCommand validations", () => {
    it("should strictly block execution on production environment", async () => {
      process.env.NODE_ENV = "production";

      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "test_maintenance_key_value_12345",
          sudoPassword: "correct_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(
        new ErrorWithCode(
          "FORBIDDEN",
          "Database maintenance endpoints are strictly disabled on production environments.",
          403,
        ),
      );
    });

    it("should throw Forbidden when SYSTEM_MAINTENANCE_KEY is not set on server", async () => {
      delete process.env.SYSTEM_MAINTENANCE_KEY;

      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "some_key",
          sudoPassword: "correct_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(/SYSTEM_MAINTENANCE_KEY is not configured on the server/);
    });

    it("should throw Forbidden when key is missing or incorrect", async () => {
      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "",
          sudoPassword: "correct_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(/Missing SYSTEM_MAINTENANCE_KEY/);

      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "wrong_key_value",
          sudoPassword: "correct_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(/Invalid SYSTEM_MAINTENANCE_KEY/);
    });

    it("should throw InvalidCredentials when sudoPassword is missing or incorrect", async () => {
      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "test_maintenance_key_value_12345",
          sudoPassword: "",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(/Missing sudoPassword/);

      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "test_maintenance_key_value_12345",
          sudoPassword: "wrong_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(/Invalid sudo password/);
    });

    it("should fail execution with 409 Conflict if database maintenance is locked", async () => {
      mockRedis.set.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue("other-dev@ecom.com");

      await expect(
        service.executeCommand({
          action: "migrate-status",
          maintenanceKey: "test_maintenance_key_value_12345",
          sudoPassword: "correct_password",
          userId: "user_123",
          username: "test-dev@ecom.com",
          writeStream,
        }),
      ).rejects.toThrowError(/Database is currently undergoing maintenance by other-dev@ecom.com/);
    });
  });

  describe("process execution and streaming", () => {
    let mockChild: any;

    beforeEach(() => {
      mockRedis.set.mockResolvedValue("OK");
      mockRedis.del.mockResolvedValue(1);

      mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockChild);
    });

    it("should successfully execute validate command and output clean logs", async () => {
      mockChild.stdout.on.mockImplementation((event: string, callback: any) => {
        if (event === "data") {
          callback(Buffer.from("\u001b[32m✔ Schema is valid\u001b[39m\n"));
        }
      });

      mockChild.on.mockImplementation((event: string, callback: any) => {
        if (event === "close") {
          callback(0);
        }
      });

      await service.executeCommand({
        action: "validate",
        maintenanceKey: "test_maintenance_key_value_12345",
        sudoPassword: "correct_password",
        userId: "user_123",
        username: "test-dev@ecom.com",
        writeStream,
      });

      expect(spawn).toHaveBeenCalledWith("npx", ["prisma", "validate"], expect.any(Object));
      expect(writeStream.data).toContain("✔ Schema is valid");
      expect(writeStream.data).not.toContain("\u001b[32m");
    });
  });
});
