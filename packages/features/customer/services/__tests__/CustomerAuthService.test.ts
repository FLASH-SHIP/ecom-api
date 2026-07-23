import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CustomerRepository } from "../../repositories/CustomerRepository";
import { CustomerAuthService } from "../CustomerAuthService";

// Mock environment variables
beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.CUSTOMER_APP_URL = "http://localhost:3000";
});

const mockNotify = vi.fn().mockResolvedValue({ id: 1 });

function createMockDeps() {
  return {
    customerRepo: {
      findByEmail: vi.fn(),
      isUsernameAvailable: vi.fn(),
      generateUniqueUsername: vi.fn(),
      createWithPassword: vi.fn(),
      findById: vi.fn(),
      findByEmailOrUsername: vi.fn(),
      updateLastLogin: vi.fn(),
      findLatestPendingVerificationCode: vi.fn(),
      invalidatePreviousVerificationCodes: vi.fn(),
      createVerificationCode: vi.fn(),
      markVerificationCodeExpired: vi.fn(),
      incrementVerificationCodeAttempts: vi.fn(),
      markVerificationCodeVerified: vi.fn(),
      verifyEmail: vi.fn(),
      findByIdWithPassword: vi.fn(),
      updatePassword: vi.fn(),
      deleteSessions: vi.fn(),
    } as unknown as CustomerRepository,
    notificationService: {
      notify: mockNotify,
    } as any,
  };
}

describe("CustomerAuthService", () => {
  it("should send registration verification code email", async () => {
    const deps = createMockDeps();
    const service = new CustomerAuthService(deps);

    deps.customerRepo.findByEmail.mockResolvedValue(null);
    deps.customerRepo.findLatestPendingVerificationCode.mockResolvedValue(null);

    await service.sendVerificationCode("john@example.com");

    expect(deps.customerRepo.invalidatePreviousVerificationCodes).toHaveBeenCalledWith(
      "john@example.com",
    );
    expect(deps.customerRepo.createVerificationCode).toHaveBeenCalledWith(
      "john@example.com",
      expect.any(String),
      expect.any(Date),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer.verification_code",
        emailRecipient: "john@example.com",
        variables: expect.objectContaining({
          code: expect.any(String),
        }),
      }),
    );
  });

  it("should register customer and mark email verified after checking code", async () => {
    const deps = createMockDeps();
    const service = new CustomerAuthService(deps);

    deps.customerRepo.findLatestPendingVerificationCode.mockResolvedValue({
      id: 1,
      code: "123456",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });
    deps.customerRepo.findByEmail.mockResolvedValue(null);

    deps.customerRepo.generateUniqueUsername.mockResolvedValue("johndoe");
    deps.customerRepo.createWithPassword.mockResolvedValue({
      id: 42,
      email: "john@example.com",
      username: "johndoe",
      name: "John Doe",
    });

    const result = await service.register({
      email: "john@example.com",
      password: "password123",
      code: "123456",
    });

    expect(result.id).toBe(42);
    expect(deps.customerRepo.markVerificationCodeVerified).toHaveBeenCalledWith(1);
    expect(deps.customerRepo.createWithPassword).toHaveBeenCalled();
    expect(deps.customerRepo.verifyEmail).toHaveBeenCalledWith(42);
  });

  it("should queue password reset email for forgotPassword", async () => {
    const deps = createMockDeps();
    const service = new CustomerAuthService(deps);

    deps.customerRepo.findByEmail.mockResolvedValue({
      id: 42,
      email: "john@example.com",
      username: "johndoe",
      name: "John Doe",
      status: "ACTIVE",
    });

    await service.forgotPassword("john@example.com");

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 42,
        type: "customer.password_reset",
        emailRecipient: "john@example.com",
        variables: expect.objectContaining({
          name: "John Doe",
          resetUrl: expect.stringContaining("/auth/reset-password?token="),
        }),
      }),
    );
  });
});
