import { createHash } from "node:crypto";
import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import type { NotificationService } from "@ecom/features/notification/services/NotificationService";
import { runInTransaction } from "@ecom/prisma";
import { hashPassword, verifyPassword } from "@flash-ship/ecom-lib/crypto";
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import { RedisCache, RedisRateLimiter } from "@flash-ship/ecom-lib/redis";
import { ExternalWalletClient } from "@ecom/features/topup/clients/ExternalWalletClient";
import jwt from "jsonwebtoken";
import { CustomerTokenService } from "./CustomerTokenService";

const log = createLogger("CustomerAuthService");

const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL ?? "http://localhost:3001";

export interface ActiveCustomerTokenResponse {
  customer: {
    id: string;
    email: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

const activeTokenCacheTtl = process.env.JWT_ACTIVE_CACHE_TTL_SECONDS
  ? Number.parseInt(process.env.JWT_ACTIVE_CACHE_TTL_SECONDS, 10)
  : 780;

const activeTokenCache = new RedisCache<ActiveCustomerTokenResponse>(
  "customer-active-token",
  activeTokenCacheTtl,
);
const failedLoginLimiter = new RedisRateLimiter("customer-login-fails", 5, 900); // 5 fails per 15m

export interface ICustomerAuthServiceDeps {
  customerRepo: CustomerRepository;
  notificationService?: NotificationService;
  getNotificationService?: () => NotificationService;
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

  private get notificationService(): NotificationService {
    const service = this.deps.notificationService ?? this.deps.getNotificationService?.();
    if (!service) {
      throw new Error("NotificationService is required but was not provided");
    }
    return service;
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
      if (timeSinceCreation < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - timeSinceCreation) / 1000);
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

    log.info("Sending registration verification code email", { email });
    await this.notificationService.notify({
      type: "customer.verification_code",
      titleKey: "Mã xác minh đăng ký",
      messageKey: `Mã xác minh của bạn để đăng ký tài khoản là: ${code}`,
      variables: { code },
      deliveryClass: "TRANSACTIONAL",
      emailRecipient: email,
    });
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

      const created = await this.deps.customerRepo.createWithPassword({
        email: data.email,
        username,
        hashedPassword: hashedPwd,
        groupId: null,
      });

      await this.deps.customerRepo.verifyEmail(created.id);

      return created;
    });

    log.info("New customer registered via code", {
      customerId: result.id,
      email: data.email,
      username: result.username,
    });

    // Auto-create partner wallet account in External Wallet System
    try {
      const walletClient = new ExternalWalletClient();
      const walletRes = await walletClient.createAccount({
        partnerId: result.id,
        partnerCode: result.customerCode || "",
      });
      log.info("Successfully created external wallet account for registered customer", {
        customerId: result.id,
        customerCode: result.customerCode,
        response: walletRes,
      });
    } catch (walletError) {
      const errorMsg = walletError instanceof Error ? walletError.message : String(walletError);
      log.error("Failed to create external wallet account for registered customer", {
        customerId: result.id,
        customerCode: result.customerCode,
        error: errorMsg,
      });
    }

    return result;
  }

  async acceptTerms(customerId: string) {
    const customer = await this.deps.customerRepo.findById(customerId);
    if (!customer) {
      throw new ErrorWithCode(ErrorCode.UserNotFound, "errors.CUSTOMER_NOT_FOUND", 404);
    }
    await this.deps.customerRepo.updateTermsAccepted(customerId, true);
    log.info("Customer accepted terms & conditions", { customerId });
    return { success: true, customerId };
  }

  async socialLogin(data: {
    provider: string;
    providerId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }) {
    let customer = await this.deps.customerRepo.findByEmail(data.email);
    let isNewCustomer = false;

    if (!customer) {
      const username = await this.deps.customerRepo.generateUniqueUsername(data.email);
      customer = await this.deps.customerRepo.create({
        email: data.email,
        username,
        name: data.name,
      });
      isNewCustomer = true;
    }

    if (!customer) {
      throw ErrorWithCode.Factory.Internal("Failed to create customer account during social login");
    }

    await this.deps.customerRepo.ensureSocialAccount({
      customerId: customer.id,
      provider: data.provider,
      providerId: data.providerId,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
    });

    if (isNewCustomer) {
      try {
        const walletClient = new ExternalWalletClient();
        const walletRes = await walletClient.createAccount({
          partnerId: customer.id,
          partnerCode: customer.customerCode || "",
        });
        log.info("Successfully created external wallet account for social SSO registered customer", {
          customerId: customer.id,
          customerCode: customer.customerCode,
          response: walletRes,
        });
      } catch (walletError) {
        const errorMsg = walletError instanceof Error ? walletError.message : String(walletError);
        log.error("Failed to create external wallet account for social SSO registered customer", {
          customerId: customer.id,
          customerCode: customer.customerCode,
          error: errorMsg,
        });
      }
    }

    return customer;
  }

  async login(identifier: string, password: string) {
    const normalizedId = identifier.toLowerCase().trim();
    const { allowed, resetIn } = await failedLoginLimiter.check(normalizedId);
    if (!allowed) {
      log.warn("Login blocked due to excessive failed attempts", { identifier: normalizedId });
      throw new ErrorWithCode(
        ErrorCode.VerificationCodeRateLimited,
        `Nhiều lần đăng nhập không thành công. Vui lòng thử lại sau ${resetIn} giây.`,
        429,
      );
    }

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

    await failedLoginLimiter.reset(normalizedId);
    log.info("Customer logged in", { customerId: customer.id, identifier });
    await this.deps.customerRepo.updateLastLogin(customer.id);

    return {
      id: customer.id,
      email: customer.email,
      username: customer.username,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
      isTermsAccepted: Boolean(customer.isTermsAccepted),
    };
  }

  async loginWithActiveTokenCache(
    identifier: string,
    password: string,
    userAgent = "default",
    tokenService: CustomerTokenService,
  ): Promise<ActiveCustomerTokenResponse> {
    const normalizedId = identifier.toLowerCase().trim();
    const { allowed, resetIn } = await failedLoginLimiter.check(normalizedId);
    if (!allowed) {
      log.warn("Login blocked due to excessive failed attempts", { identifier: normalizedId });
      throw new ErrorWithCode(
        ErrorCode.VerificationCodeRateLimited,
        `Nhiều lần đăng nhập không thành công. Vui lòng thử lại sau ${resetIn} giây.`,
        429,
      );
    }

    const customer = await this.deps.customerRepo.findByEmailOrUsername(identifier);
    if (!customer?.hashedPassword) {
      log.warn("Login failed: customer not found or no password", { identifier });
      throw ErrorWithCode.Factory.Unauthorized("Invalid credentials");
    }

    if (customer.status !== "ACTIVE") {
      log.warn("Login failed: account not active", { identifier, status: customer.status });
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const deviceHash = createHash("md5")
      .update(userAgent || "default")
      .digest("hex")
      .slice(0, 8);
    const cacheKey = `${customer.id}:${deviceHash}`;

    // 1. Check Redis Active Token Cache (0-bcrypt CPU hit)
    const cachedResponse = await activeTokenCache.get(cacheKey);
    if (cachedResponse) {
      log.info("Returned active customer token from Redis cache (0-bcrypt CPU)", {
        customerId: customer.id,
      });
      return cachedResponse;
    }

    // 2. Perform bcrypt password check
    const isValid = await verifyPassword(password, customer.hashedPassword);
    if (!isValid) {
      log.warn("Login failed: invalid password", { identifier });
      throw ErrorWithCode.Factory.Unauthorized("Invalid credentials");
    }

    await failedLoginLimiter.reset(normalizedId);
    log.info("Customer logged in successfully", { customerId: customer.id, identifier });
    await this.deps.customerRepo.updateLastLogin(customer.id);

    const customerData = {
      id: customer.id,
      email: customer.email,
      username: customer.username,
      name: customer.name,
      avatarUrl: customer.avatarUrl,
    };

    const tokens = tokenService.generateTokens(customerData);
    const response: ActiveCustomerTokenResponse = {
      customer: customerData,
      ...tokens,
    };

    // 3. Cache response in Redis for activeTokenCacheTtl
    await activeTokenCache.set(cacheKey, response, activeTokenCacheTtl);

    return response;
  }

  async invalidateActiveTokens(customerId: string): Promise<void> {
    await activeTokenCache.invalidatePrefix(customerId);
  }

  async changePassword(
    customerId: string,
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
    await this.invalidateActiveTokens(customerId);
    await this.deps.customerRepo.deleteSessions(customerId, currentSessionToken);
  }

  async sendVerificationEmail(customerId: string) {
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
    await this.notificationService.notify({
      customerId,
      type: "customer.email_verification",
      titleKey: "Xác minh email",
      messageKey: `Vui lòng xác minh địa chỉ email của bạn bằng cách nhấn vào nút bên dưới.`,
      variables: { name: displayName, verifyUrl },
      deliveryClass: "TRANSACTIONAL",
      emailRecipient: customer.email,
    });
  }

  async verifyEmailByToken(token: string) {
    const jwtSecret = this.jwtSecret;
    try {
      const payload = jwt.verify(token, jwtSecret, {
        issuer: "ecom",
        audience: "ecom-customer",
      }) as unknown as { sub: string; type: string };
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
    try {
      await this.notificationService.notify({
        customerId: customer.id,
        type: "customer.password_reset",
        titleKey: "Đặt lại mật khẩu tài khoản",
        messageKey: `Bạn đã yêu cầu đặt lại mật khẩu tài khoản khách hàng.`,
        variables: { name: displayName, resetUrl },
        deliveryClass: "TRANSACTIONAL",
        emailRecipient: email,
      });
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
      }) as unknown as { sub: string; type: string };
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
