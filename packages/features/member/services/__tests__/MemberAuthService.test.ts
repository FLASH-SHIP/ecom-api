import { describe, expect, it, vi } from "vitest";
import type { MemberRepository } from "../../repositories/MemberRepository";
import { MemberAuthService } from "../MemberAuthService";

function createMockMemberRepo() {
  return {
    findByEmail: vi.fn(),
    findByEmailWithPassword: vi.fn(),
    findByIdWithPassword: vi.fn(),
    createWithPassword: vi.fn(),
    updatePassword: vi.fn(),
    updateLastLogin: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  } as unknown as MemberRepository & {
    findByEmail: ReturnType<typeof vi.fn>;
    findByEmailWithPassword: ReturnType<typeof vi.fn>;
    findByIdWithPassword: ReturnType<typeof vi.fn>;
    createWithPassword: ReturnType<typeof vi.fn>;
    updatePassword: ReturnType<typeof vi.fn>;
    updateLastLogin: ReturnType<typeof vi.fn>;
  };
}

describe("MemberAuthService", () => {
  describe("register", () => {
    it("should register a new member with hashed password", async () => {
      const memberRepo = createMockMemberRepo();
      const service = new MemberAuthService({ memberRepo });

      memberRepo.findByEmail.mockResolvedValue(null);
      memberRepo.createWithPassword.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        name: "Test",
      });

      const result = await service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test",
      });

      expect(result).toEqual({ id: 1, email: "test@example.com", name: "Test" });
      expect(memberRepo.createWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          name: "Test",
          hashedPassword: expect.any(String),
        }),
      );
    });

    it("should throw Conflict when email already exists", async () => {
      const memberRepo = createMockMemberRepo();
      const service = new MemberAuthService({ memberRepo });

      memberRepo.findByEmail.mockResolvedValue({ id: 1, email: "test@example.com" });

      await expect(
        service.register({ email: "test@example.com", password: "password123" }),
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("login", () => {
    it("should throw when member not found", async () => {
      const memberRepo = createMockMemberRepo();
      const service = new MemberAuthService({ memberRepo });

      memberRepo.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login("missing@example.com", "pass")).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw when member has no password", async () => {
      const memberRepo = createMockMemberRepo();
      const service = new MemberAuthService({ memberRepo });

      memberRepo.findByEmailWithPassword.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        hashedPassword: null,
        status: "ACTIVE",
      });

      await expect(service.login("test@example.com", "pass")).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw when member is not active", async () => {
      const memberRepo = createMockMemberRepo();
      const service = new MemberAuthService({ memberRepo });

      memberRepo.findByEmailWithPassword.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        hashedPassword: "$2a$12$fakehash",
        status: "BANNED",
      });

      await expect(service.login("test@example.com", "pass")).rejects.toThrow(
        "Account is not active",
      );
    });
  });
});
