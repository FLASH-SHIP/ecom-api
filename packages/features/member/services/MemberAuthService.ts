import type { MemberRepository } from "@ecom/features/member/repositories/MemberRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("MemberAuthService");

export interface IMemberAuthServiceDeps {
  memberRepo: MemberRepository;
}

export class MemberAuthService {
  private deps: IMemberAuthServiceDeps;
  constructor(deps: IMemberAuthServiceDeps) {
    this.deps = deps;
  }

  /**
   * Register a new member with email + password.
   */
  async register(data: { email: string; password: string; name?: string }) {
    const existing = await this.deps.memberRepo.findByEmail(data.email);
    if (existing) {
      log.warn("Registration attempt with existing email", { email: data.email });
      throw ErrorWithCode.Factory.Conflict("Email already registered");
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const result = await this.deps.memberRepo.createWithPassword({
      email: data.email,
      name: data.name,
      hashedPassword,
    });

    log.info("New member registered", { memberId: result.id, email: data.email });
    return result;
  }

  /**
   * Authenticate member by email + password.
   * Returns the member if credentials are valid.
   */
  async login(email: string, password: string) {
    const member = await this.deps.memberRepo.findByEmailWithPassword(email);
    if (!member?.hashedPassword) {
      log.warn("Login failed: member not found or no password", { email });
      throw ErrorWithCode.Factory.Unauthorized("Invalid email or password");
    }

    if (member.status !== "ACTIVE") {
      log.warn("Login failed: account not active", { email, status: member.status });
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(password, member.hashedPassword);
    if (!isValid) {
      log.warn("Login failed: invalid password", { email });
      throw ErrorWithCode.Factory.Unauthorized("Invalid email or password");
    }

    log.info("Member logged in", { memberId: member.id, email });

    await this.deps.memberRepo.updateLastLogin(member.id);

    return {
      id: member.id,
      email: member.email,
      name: member.name,
      avatarUrl: member.avatarUrl,
    };
  }

  /**
   * Change password for an authenticated member.
   */
  async changePassword(memberId: number, oldPassword: string, newPassword: string) {
    const member = await this.deps.memberRepo.findByIdWithPassword(memberId);
    if (!member?.hashedPassword) {
      throw ErrorWithCode.Factory.NotFound("Member not found");
    }

    const bcrypt = await import("bcryptjs");
    const isValid = await bcrypt.compare(oldPassword, member.hashedPassword);
    if (!isValid) {
      throw ErrorWithCode.Factory.BadRequest("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.deps.memberRepo.updatePassword(memberId, hashedPassword);
  }
}
