import { signCustomerAccessToken } from "@flash-ship/ecom-lib/jwt";
import { describe, expect, it, vi } from "vitest";
import { ApiAuthService } from "../ApiAuthService";

// biome-ignore lint/suspicious/noExplicitAny: mock deps bypasses strict class type checks
function createMockDeps(): any {
  return {
    apiKeyRepo: {
      findByHashedKey: vi.fn(),
      updateLastUsed: vi.fn().mockResolvedValue({ id: "1" }),
    },
    userRepo: {},
    roleRepo: {},
    customerRepo: {
      findById: vi.fn().mockResolvedValue({
        id: "cust_123",
        email: "cust@example.com",
        name: "Customer Test",
        status: "ACTIVE",
      }),
    },
  };
}

describe("ApiAuthService", () => {
  describe("authenticateBearer", () => {
    it("should authorize request when IP is empty (no whitelist configured)", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      const rawKey = "ecom_cust_abc123";

      deps.apiKeyRepo.findByHashedKey.mockResolvedValue({
        id: "1",
        ownerId: "cust_123",
        ownerType: "Customer",
        maskedKey: "ecom_cust_***c123",
        allowedIps: [],
        expiresAt: null,
      });

      const user = await service.authenticateBearer(rawKey, "192.168.1.1");
      expect(user.id).toBe("cust_123");
      expect(user.ownerType).toBe("Customer");
    });

    it("should authorize request when IP matches whitelist", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      const rawKey = "ecom_cust_abc123";
      deps.apiKeyRepo.findByHashedKey.mockResolvedValue({
        id: "1",
        ownerId: "cust_123",
        ownerType: "Customer",
        maskedKey: "ecom_cust_***c123",
        allowedIps: ["192.168.1.1", "127.0.0.1"],
        expiresAt: null,
      });

      const user = await service.authenticateBearer(rawKey, "192.168.1.1");
      expect(user.id).toBe("cust_123");
    });

    it("should authorize request when IP matches with ipv6 mapped prefix", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      const rawKey = "ecom_cust_abc123";
      deps.apiKeyRepo.findByHashedKey.mockResolvedValue({
        id: "1",
        ownerId: "cust_123",
        ownerType: "Customer",
        maskedKey: "ecom_cust_***c123",
        allowedIps: ["127.0.0.1"],
        expiresAt: null,
      });

      const user = await service.authenticateBearer(rawKey, "::ffff:127.0.0.1");
      expect(user.id).toBe("cust_123");
    });

    it("should authorize request when IP matches a CIDR range in whitelist", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      const rawKey = "ecom_cust_abc123";
      deps.apiKeyRepo.findByHashedKey.mockResolvedValue({
        id: "1",
        ownerId: "cust_123",
        ownerType: "Customer",
        maskedKey: "ecom_cust_***c123",
        allowedIps: ["192.168.1.0/24", "10.0.0.0/8"],
        expiresAt: null,
      });

      const user = await service.authenticateBearer(rawKey, "192.168.1.50");
      expect(user.id).toBe("cust_123");

      const user2 = await service.authenticateBearer(rawKey, "10.250.0.99");
      expect(user2.id).toBe("cust_123");
    });

    it("should reject request when IP does not match whitelist", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      const rawKey = "ecom_cust_abc123";
      deps.apiKeyRepo.findByHashedKey.mockResolvedValue({
        id: "1",
        ownerId: "cust_123",
        ownerType: "Customer",
        maskedKey: "ecom_cust_***c123",
        allowedIps: ["127.0.0.1"],
        expiresAt: null,
      });

      await expect(service.authenticateBearer(rawKey, "192.168.1.1")).rejects.toThrow(
        "IP address not allowed",
      );
    });

    it("should reject request when API Key is expired", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      const rawKey = "ecom_cust_abc123";
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      deps.apiKeyRepo.findByHashedKey.mockResolvedValue({
        id: "1",
        ownerId: "cust_123",
        ownerType: "Customer",
        maskedKey: "ecom_cust_***c123",
        allowedIps: [],
        expiresAt: yesterday,
      });

      await expect(service.authenticateBearer(rawKey, "192.168.1.1")).rejects.toThrow(
        "API key expired",
      );
    });

    it("should authorize customer request when given a valid Customer JWT token", async () => {
      const deps = createMockDeps();
      const service = new ApiAuthService(deps);

      // Create a valid customer access token
      const token = signCustomerAccessToken({
        sub: "cust_123",
        email: "cust@example.com",
      });

      const user = await service.authenticateBearer(token, "192.168.1.1");
      expect(user.id).toBe("cust_123");
      expect(user.email).toBe("cust@example.com");
      expect(user.ownerType).toBe("Customer");
      expect(user.permissions).toEqual(["customer"]);
    });

    it("should reject customer request when Customer account status is INACTIVE", async () => {
      const deps = createMockDeps();
      deps.customerRepo.findById.mockResolvedValue({
        id: "cust_123",
        email: "cust@example.com",
        name: "Customer Test",
        status: "INACTIVE",
      });
      const service = new ApiAuthService(deps);

      const token = signCustomerAccessToken({
        sub: "cust_123",
        email: "cust@example.com",
      });

      await expect(service.authenticateBearer(token, "192.168.1.1")).rejects.toThrow(
        "Customer account is not active",
      );
    });
  });
});
