import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CustomerRepository } from "../../repositories/CustomerRepository";
import { CustomerAuthService } from "../CustomerAuthService";

// Mock environment variables
beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.CUSTOMER_APP_URL = "http://localhost:3000";
});

// Mock dependencies
const mockQueueEmail = vi.fn();
vi.mock("@ecom/features/queue/workers/emailWorker", () => ({
  queueEmail: (...args: unknown[]) => mockQueueEmail(...args),
}));

const mockBuildEmailVerificationEmail = vi.fn((data) => ({
  to: "",
  subject: "Verify Email",
  html: `<p>Verify: ${data.verifyUrl}</p>`,
}));
const mockBuildCustomerPasswordResetEmail = vi.fn((data) => ({
  to: "",
  subject: "Reset Password",
  html: `<p>Reset: ${data.resetUrl}</p>`,
}));

vi.mock("@ecom/emails", () => ({
  buildEmailVerificationEmail: (data: unknown) => mockBuildEmailVerificationEmail(data),
  buildCustomerPasswordResetEmail: (data: unknown) => mockBuildCustomerPasswordResetEmail(data),
}));

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
    } as unknown as CustomerRepository,
  };
}

describe("CustomerAuthService", () => {
  it("should register customer and queue verification email", async () => {
    const deps = createMockDeps();
    const service = new CustomerAuthService(deps);

    deps.customerRepo.findByEmail.mockResolvedValue(null);
    deps.customerRepo.generateUniqueUsername.mockResolvedValue("johndoe");
    deps.customerRepo.createWithPassword.mockResolvedValue({
      id: 42,
      email: "john@example.com",
      username: "johndoe",
      name: "John Doe",
    });
    deps.customerRepo.findById.mockResolvedValue({
      id: 42,
      email: "john@example.com",
      name: "John Doe",
      emailVerified: null,
    });

    const result = await service.register({
      email: "john@example.com",
      password: "password123",
      name: "John Doe",
    });

    expect(result.id).toBe(42);
    expect(deps.customerRepo.createWithPassword).toHaveBeenCalled();
    expect(mockBuildEmailVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        verifyUrl: expect.stringContaining("/auth/verify-email?token="),
      }),
    );
    expect(mockQueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "john@example.com",
        subject: "Verify Email",
      }),
    );
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

    expect(mockBuildCustomerPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        resetUrl: expect.stringContaining("/auth/reset-password?token="),
      }),
    );
    expect(mockQueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "john@example.com",
        subject: "Reset Password",
      }),
    );
  });
});
