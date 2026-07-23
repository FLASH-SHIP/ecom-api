import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceTokenRepository } from "../../repositories/DeviceTokenRepository";
import { DeviceTokenService } from "../DeviceTokenService";

describe("DeviceTokenService", () => {
  let mockDeviceTokenRepo: Record<string, unknown>;
  let service: DeviceTokenService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeviceTokenRepo = {
      upsertToken: vi.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
      deleteToken: vi.fn().mockResolvedValue({ count: 1 }),
      findByOwner: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteInactiveSince: vi.fn().mockResolvedValue({ count: 1 }),
    };
  });

  it("should upsert token with default maxTokens when not configured", async () => {
    service = new DeviceTokenService({
      deviceTokenRepo: mockDeviceTokenRepo as unknown as DeviceTokenRepository,
    });

    await service.registerToken({
      token: "token-123",
      platform: "android",
      userId: "user-1",
    });

    expect(mockDeviceTokenRepo.upsertToken).toHaveBeenCalledWith(
      {
        token: "token-123",
        platform: "android",
        userId: "user-1",
      },
      10, // Default maxTokens
    );
  });

  it("should upsert token with configured maxTokensPerOwner", async () => {
    service = new DeviceTokenService({
      deviceTokenRepo: mockDeviceTokenRepo as unknown as DeviceTokenRepository,
      config: {
        maxTokensPerOwner: 5,
      },
    });

    await service.registerToken({
      token: "token-456",
      platform: "ios",
      customerId: "customer-1",
    });

    expect(mockDeviceTokenRepo.upsertToken).toHaveBeenCalledWith(
      {
        token: "token-456",
        platform: "ios",
        customerId: "customer-1",
      },
      5, // Configured maxTokens
    );
  });

  it("should throw error if token is missing", async () => {
    service = new DeviceTokenService({
      deviceTokenRepo: mockDeviceTokenRepo as unknown as DeviceTokenRepository,
    });

    await expect(
      service.registerToken({
        token: "",
        platform: "android",
      }),
    ).rejects.toThrow("Device token is required");
  });
});
