import { beforeAll, describe, expect, it, vi } from "vitest";
import { CustomerTokenService } from "../CustomerTokenService";

// Mock environment variables
beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret";
});

// Mock Redis client
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
};
vi.mock("@flash-ship/ecom-lib/redis", () => ({
  getRedisClient: () => mockRedis,
}));

describe("CustomerTokenService", () => {
  it("should generate tokens with jti", () => {
    const service = new CustomerTokenService();
    const tokens = service.generateTokens({ id: "123", email: "user@example.com" });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it("should generate a single access token", () => {
    const service = new CustomerTokenService();
    const accessToken = service.generateAccessToken({ id: "123", email: "user@example.com" });

    expect(accessToken).toBeDefined();
  });

  it("should verify a valid access token and refresh token", async () => {
    const service = new CustomerTokenService();
    const tokens = service.generateTokens({ id: 123, email: "user@example.com" });

    mockRedis.get.mockResolvedValue(null); // Not blacklisted, not revoked

    const accessPayload = await service.verifyAccessToken(tokens.accessToken);
    expect(accessPayload.sub).toBe(123);
    expect(accessPayload.email).toBe("user@example.com");
    expect(accessPayload.jti).toBeDefined();

    const refreshPayload = await service.verifyRefreshToken(tokens.refreshToken);
    expect(refreshPayload.sub).toBe(123);
    expect(refreshPayload.email).toBe("user@example.com");
    expect(refreshPayload.jti).toBeDefined();
  });

  it("should reject blacklisted tokens", async () => {
    const service = new CustomerTokenService();
    const tokens = service.generateTokens({ id: 123, email: "user@example.com" });

    // Mock Redis returning "1" (meaning blacklisted)
    mockRedis.get.mockImplementation((key: string) => {
      if (key.includes("token_blacklist")) {
        return Promise.resolve("1");
      }
      return Promise.resolve(null);
    });

    await expect(service.verifyAccessToken(tokens.accessToken)).rejects.toThrow(
      "Token is blacklisted",
    );
  });

  it("should reject revoked tokens based on revoked_before timestamp", async () => {
    const service = new CustomerTokenService();
    const tokens = service.generateTokens({ id: 123, email: "user@example.com" });

    // Mock Redis returning a revocation timestamp in the future (after token iat)
    mockRedis.get.mockImplementation((key: string) => {
      if (key.includes("revoked_before")) {
        // Set revocation time to current time + 10s so that token iat (current time) is before it
        return Promise.resolve(String(Math.floor(Date.now() / 1000) + 10));
      }
      return Promise.resolve(null);
    });

    await expect(service.verifyAccessToken(tokens.accessToken)).rejects.toThrow(
      "Token has been revoked",
    );
  });
});
