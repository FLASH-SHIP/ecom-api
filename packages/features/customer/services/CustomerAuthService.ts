import {
  buildCustomerPasswordResetEmail,
  buildEmailVerificationEmail,
  buildVerificationCodeEmail,
} from "@ecom/emails";
import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import { queueEmail } from "@ecom/features/queue/workers/emailWorker";
import { hashPassword, verifyPassword } from "@ecom/lib/crypto";
import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";
import { runInTransaction } from "@ecom/prisma";
import jwt from "jsonwebtoken";
import { CustomerTokenService } from "./CustomerTokenService";

const log = createLogger("CustomerAuthService");

const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL ?? "http://localhost:3001";

export interface ICustomerAuthServiceDeps {
  customerRepo: CustomerRepository;
}

export class CustomerAuthService {
  private deps: ICustomerAuthServiceDeps;
  private jwtSecret: string;

  constructor(deps: ICustomerAuthServiceDeps) {
    this.deps = deps;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    this.jwtSecret = secret;
  }

  async sendVerificationCode(email: string) {
    const existing = await this.deps.customerRepo.findByEmail(email);
    if (existing) {
      log.warn("Send OTP code failed: email already registered", { email });
      throw new ErrorWithCode(ErrorCode.EmailAlreadyExists, "errors.EMAIL_ALREADY_EXISTS", 409);
    }

    const latestCode = await this.deps.customerRepo.findLatestPendingVerificationCode(email);
    if (latestCode) {
      const timeSinceCreation = Date.now() - latestCode.createdAt.getTime();
      if (timeSinceCreation < 120 * 1000) {
        const remainingSeconds = Math.ceil((120 * 1000 - timeSinceCreation) / 1000);
        throw new ErrorWithCode(
          ErrorCode.VerificationCodeRateLimited,
          "errors.VERIFICATION_CODE_RATE_LIMITED",
          400,
          { seconds: remainingSeconds },
        );
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await this.deps.customerRepo.invalidatePreviousVerificationCodes(email);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.deps.customerRepo.createVerificationCode(email, code, expiresAt);

    const payload = buildVerificationCodeEmail({ code });
    payload.to = email;

    log.info("Sending registration verification code email", { email });
    await queueEmail(payload);
  }

  async register(data: { email: string; password: string; code: string }) {
    const pendingCode = await this.deps.customerRepo.findLatestPendingVerificationCode(data.email);

    if (!pendingCode) {
      throw new ErrorWithCode(
        ErrorCode.VerificationCodeInvalid,
        "errors.VERIFICATION_CODE_INVALID",
        400,
      );
    }

    if (pendingCode.expiresAt.getTime() < Date.now()) {
      await this.deps.customerRepo.markVerificationCodeExpired(pendingCode.id);
      throw new ErrorWithCode(
        ErrorCode.VerificationCodeExpired,
        "errors.VERIFICATION_CODE_EXPIRED",
        400,
      );
    }

    if (pendingCode.attempts >= 5) {
      await this.deps.customerRepo.markVerificationCodeExpired(pendingCode.id);
      throw new ErrorWithCode(
        ErrorCode.VerificationCodeLocked,
        "errors.VERIFICATION_CODE_LOCKED",
        400,
      );
    }

    if (pendingCode.code !== data.code) {
      const attempts = await this.deps.customerRepo.incrementVerificationCodeAttempts(
        pendingCode.id,
      );
      if (attempts >= 5) {
        await this.deps.customerRepo.markVerificationCodeExpired(pendingCode.id);
        throw new ErrorWithCode(
          ErrorCode.VerificationCodeLocked,
          "errors.VERIFICATION_CODE_LOCKED",
          400,
        );
      }
      const remaining = 5 - attempts;
      throw new ErrorWithCode(
        ErrorCode.VerificationCodeAttempts,
        "errors.VERIFICATION_CODE_ATTEMPTS",
        400,
        { count: remaining },
      );
    }

    const existing = await this.deps.customerRepo.findByEmail(data.email);
    if (existing) {
      log.warn("Registration attempt with existing email", { email: data.email });
      throw new ErrorWithCode(ErrorCode.EmailAlreadyExists, "errors.EMAIL_ALREADY_EXISTS", 409);
    }

    const result = await runInTransaction(async () => {
      await this.deps.customerRepo.markVerificationCodeVerified(pendingCode.id);

      const username = await this.deps.customerRepo.generateUniqueUsername(data.email);

      const hashedPwd = await hashPassword(data.password);

      const defaultGroup = await this.deps.customerRepo.findOrCreateDefaultGroup();

      const created = await this.deps.customerRepo.createWithPassword({
        email: data.email,
        username,
        hashedPassword: hashedPwd,
        groupId: defaultGroup.id,
      });

      await this.deps.customerRepo.verifyEmail(created.id);

      return created;
    });

    log.info("New customer registered via code", {
      customerId: result.id,
      email: data.email,
      username: result.username,
    });

    return result;
  }

  async login(identifier: string, password: string) {
    const customer = await this.deps.customerRepo.findByEmailOrUsername(identifier);
    if (!customer?.hashedPassword) {
      log.warn("Login failed: customer not found or no password", { identifier });
      throw ErrorWithCode.Factory.Unauthorized("Invalid credentials");
    }

    if (customer.status !== "ACTIVE") {
      log.warn("Login failed: account not active", { identifier, status: customer.status });
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const isValid = await verifyPassword(password, customer.hashedPassword);
    if (!isValid) {
      log.warn("Login failed: invalid password", { identifier });
      throw ErrorWithCode.Factory.Unauthorized("Invalid credentials");
    }

    log.info("Customer logged in", { customerId: customer.id, identifier });

    await this.deps.customerRepo.updateLastLogin(customer.id);

    return {
      id: customer.id,
      email: customer.email,
      username: customer.username,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
    };
  }

  async changePassword(
    customerId: number,
    oldPassword: string,
    newPassword: string,
    currentSessionToken?: string,
  ) {
    const customer = await this.deps.customerRepo.findByIdWithPassword(customerId);
    if (!customer?.hashedPassword) {
      throw ErrorWithCode.Factory.NotFound("Customer not found");
    }
    if (customer.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const isValid = await verifyPassword(oldPassword, customer.hashedPassword);
    if (!isValid) {
      throw ErrorWithCode.Factory.BadRequest("Current password is incorrect");
    }

    const hashedPwd = await hashPassword(newPassword);
    await this.deps.customerRepo.updatePassword(customerId, hashedPwd);

    // Revoke all existing customer tokens and NextAuth sessions on password change
    await new CustomerTokenService().revokeAllTokens(customerId);
    await this.deps.customerRepo.deleteSessions(customerId, currentSessionToken);
  }

  async sendVerificationEmail(customerId: number) {
    const customer = await this.deps.customerRepo.findById(customerId);
    if (!customer) {
      throw ErrorWithCode.Factory.NotFound("Customer not found");
    }

    if (customer.emailVerified) {
      return;
    }

    const jwtSecret = this.jwtSecret;

    const token = jwt.sign({ sub: customerId, type: "email-verify" }, jwtSecret, {
      expiresIn: "24h",
      issuer: "ecom",
      audience: "ecom-customer",
    });

    const verifyUrl = `${CUSTOMER_APP_URL}/auth/verify-email?token=${token}`;
    const displayName = customer.name ?? customer.email;

    log.info("Verification email prepared", { customerId, email: customer.email, verifyUrl });
    const payload = buildEmailVerificationEmail({
      name: displayName,
      verifyUrl,
    });
    payload.to = customer.email;
    await queueEmail(payload);
  }

  async verifyEmailByToken(token: string) {
    const jwtSecret = this.jwtSecret;
    try {
      const payload = jwt.verify(token, jwtSecret, {
        issuer: "ecom",
        audience: "ecom-customer",
      }) as unknown as { sub: number; type: string };
      if (payload.type !== "email-verify") {
        throw ErrorWithCode.Factory.BadRequest("Invalid token type");
      }

      await this.deps.customerRepo.verifyEmail(payload.sub);
      log.info("Email verified", { customerId: payload.sub });
      return { customerId: payload.sub };
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.BadRequest("Invalid or expired verification token");
    }
  }

  async forgotPassword(email: string) {
    const customer = await this.deps.customerRepo.findByEmail(email);
    if (!customer) {
      log.info("Forgot password attempt for non-existent email", { email });
      return;
    }

    const jwtSecret = this.jwtSecret;

    const token = jwt.sign({ sub: customer.id, type: "password-reset" }, jwtSecret, {
      expiresIn: "1h",
      issuer: "ecom",
      audience: "ecom-customer",
    });

    const resetUrl = `${CUSTOMER_APP_URL}/auth/reset-password?token=${token}`;

    log.info("Password reset URL prepared", { customerId: customer.id, email, resetUrl });
    const displayName = customer.name ?? customer.email;
    const payload = buildCustomerPasswordResetEmail({
      name: displayName,
      resetUrl,
    });
    payload.to = email;
    try {
      await queueEmail(payload);
    } catch (error) {
      log.error("Failed to queue password reset email", {
        customerId: customer.id,
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw ErrorWithCode.Factory.Internal(
        "Failed to send password reset email. Please try again later.",
      );
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const jwtSecret = this.jwtSecret;
    try {
      const payload = jwt.verify(token, jwtSecret, {
        issuer: "ecom",
        audience: "ecom-customer",
      }) as unknown as { sub: number; type: string };
      if (payload.type !== "password-reset") {
        throw ErrorWithCode.Factory.BadRequest("Invalid token type");
      }

      const hashedPwd = await hashPassword(newPassword);
      await this.deps.customerRepo.updatePassword(payload.sub, hashedPwd);

      // Revoke all existing customer tokens and NextAuth sessions on password reset
      await new CustomerTokenService().revokeAllTokens(payload.sub);
      await this.deps.customerRepo.deleteSessions(payload.sub);

      log.info("Password reset completed", { customerId: payload.sub });
      return { customerId: payload.sub };
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.BadRequest("Invalid or expired reset token");
    }
  }
}
