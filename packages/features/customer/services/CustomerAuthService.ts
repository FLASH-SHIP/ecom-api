import { buildCustomerPasswordResetEmail, buildEmailVerificationEmail } from "@ecom/emails";
import { USERNAME_REGEX, USERNAME_VALIDATION_MESSAGE } from "@ecom/features/customer/constants";
import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import { queueEmail } from "@ecom/features/queue/workers/emailWorker";
import { hashPassword, verifyPassword } from "@ecom/lib/crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";
import jwt from "jsonwebtoken";

const log = createLogger("CustomerAuthService");

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL ?? "http://localhost:3001";

export interface ICustomerAuthServiceDeps {
  customerRepo: CustomerRepository;
}

export class CustomerAuthService {
  private deps: ICustomerAuthServiceDeps;
  constructor(deps: ICustomerAuthServiceDeps) {
    this.deps = deps;
  }

  async register(data: { email: string; password: string; username?: string; name?: string }) {
    const existing = await this.deps.customerRepo.findByEmail(data.email);
    if (existing) {
      log.warn("Registration attempt with existing email", { email: data.email });
      throw ErrorWithCode.Factory.Conflict("Email already registered");
    }

    if (data.username) {
      if (!USERNAME_REGEX.test(data.username)) {
        throw ErrorWithCode.Factory.BadRequest(USERNAME_VALIDATION_MESSAGE);
      }
      const available = await this.deps.customerRepo.isUsernameAvailable(data.username);
      if (!available) {
        throw ErrorWithCode.Factory.Conflict("Username is already taken");
      }
    }

    const username =
      data.username ?? (await this.deps.customerRepo.generateUniqueUsername(data.email));

    const hashedPwd = await hashPassword(data.password);

    const result = await this.deps.customerRepo.createWithPassword({
      email: data.email,
      username,
      name: data.name,
      hashedPassword: hashedPwd,
    });

    log.info("New customer registered", { customerId: result.id, email: data.email, username });

    try {
      await this.sendVerificationEmail(result.id);
    } catch (error) {
      log.warn(
        "Failed to send verification email during registration — email service may not be configured",
        {
          customerId: result.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

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

  async changePassword(customerId: number, oldPassword: string, newPassword: string) {
    const customer = await this.deps.customerRepo.findByIdWithPassword(customerId);
    if (!customer?.hashedPassword) {
      throw ErrorWithCode.Factory.NotFound("Customer not found");
    }

    const isValid = await verifyPassword(oldPassword, customer.hashedPassword);
    if (!isValid) {
      throw ErrorWithCode.Factory.BadRequest("Current password is incorrect");
    }

    const hashedPwd = await hashPassword(newPassword);
    await this.deps.customerRepo.updatePassword(customerId, hashedPwd);
  }

  async sendVerificationEmail(customerId: number) {
    const customer = await this.deps.customerRepo.findById(customerId);
    if (!customer) {
      throw ErrorWithCode.Factory.NotFound("Customer not found");
    }

    if (customer.emailVerified) {
      return;
    }

    const jwtSecret = getJwtSecret();

    const token = jwt.sign({ sub: customerId, type: "email-verify" }, jwtSecret, {
      expiresIn: "24h",
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
    const jwtSecret = getJwtSecret();
    try {
      const payload = jwt.verify(token, jwtSecret) as unknown as { sub: number; type: string };
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

    const jwtSecret = getJwtSecret();

    const token = jwt.sign({ sub: customer.id, type: "password-reset" }, jwtSecret, {
      expiresIn: "1h",
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
    const jwtSecret = getJwtSecret();
    try {
      const payload = jwt.verify(token, jwtSecret) as unknown as { sub: number; type: string };
      if (payload.type !== "password-reset") {
        throw ErrorWithCode.Factory.BadRequest("Invalid token type");
      }

      const hashedPwd = await hashPassword(newPassword);
      await this.deps.customerRepo.updatePassword(payload.sub, hashedPwd);

      log.info("Password reset completed", { customerId: payload.sub });
      return { customerId: payload.sub };
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.BadRequest("Invalid or expired reset token");
    }
  }
}
