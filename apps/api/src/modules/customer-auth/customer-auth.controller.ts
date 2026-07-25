import type { CustomerTokenPayload } from "@ecom/features/customer/services/CustomerTokenService";
import {
  getCustomerAuthService,
  getCustomerService,
  getCustomerTokenService,
} from "@ecom/features/di/containers/CustomerService";
import { ErrorWithCode } from "@ecom/lib/errors";
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { CustomerJwtGuard } from "./customer-jwt.guard";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  SendCodeDto,
  UpdateProfileDto,
} from "./dto";

import {
  CustomerAuthResponseDto,
  CustomerProfileResponseDto,
  GenericMessageResponseDto,
  GenericSuccessResponseDto,
  TokenPairResponseDto,
} from "./dto/response-auth.dto.js";

@ApiTags("Customer Auth")
@Controller("customer/auth")
export class CustomerAuthController {
  // ─── Profile ──────────────────────────────────────────────────────────────

  /**
   * GET /customer/auth/me
   * Returns the authenticated customer's profile.
   * Requires: Authorization: Bearer <accessToken>
   */
  @Get("me")
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current customer profile" })
  @ApiResponse({ status: 200, description: "Authenticated customer profile response", type: CustomerProfileResponseDto })
  async getMe(@Req() req: Request) {
    const payload = req.customerPayload as CustomerTokenPayload;
    const customer = await getCustomerService().getCustomer(payload.sub);
    if (!customer) throw ErrorWithCode.Factory.NotFound("Customer not found");
    if (customer.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }
    return {
      data: customer,
    };
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  @Post("send-code")
  @ApiOperation({ summary: "Send registration verification code email" })
  @ApiBody({ type: SendCodeDto })
  @ApiResponse({ status: 201, description: "Verification code sent successfully", type: GenericSuccessResponseDto })
  async sendCode(@Body() body: SendCodeDto) {
    const authService = getCustomerAuthService();
    await authService.sendVerificationCode(body.email);
    return {
      data: { success: true },
    };
  }

  @Post("register")
  @ApiOperation({ summary: "Register a new customer account" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: "Customer account registered successfully", type: CustomerAuthResponseDto })
  async register(@Body() body: RegisterDto) {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    const customer = await authService.register({
      email: body.email,
      password: body.password,
      code: body.code,
    });
    const tokens = tokenService.generateTokens(customer);
    return {
      data: { customer, ...tokens },
    };
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Authenticate and log in customer (with Redis active token cache)" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: "Customer authenticated and tokens generated", type: CustomerAuthResponseDto })
  async login(@Body() body: LoginDto, @Req() req: Request) {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();
    const userAgent = req.headers["user-agent"] || "default";

    const result = await authService.loginWithActiveTokenCache(
      body.identifier,
      body.password,
      userAgent,
      tokenService,
    );
    return {
      data: result,
    };
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access and refresh token pair" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 201, description: "Token pair refreshed successfully", type: TokenPairResponseDto })
  async refreshToken(@Body() body: RefreshTokenDto) {
    const tokenService = getCustomerTokenService();

    const payload = await tokenService.verifyRefreshToken(body.refreshToken);

    const customer = await getCustomerService().getCustomer(payload.sub);
    if (customer?.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const tokens = tokenService.generateTokens({ id: payload.sub, email: payload.email });
    return {
      data: tokens,
    };
  }

  @Post("update-profile")
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update customer profile information" })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 201, description: "Customer profile updated successfully", type: CustomerProfileResponseDto })
  async updateProfile(@Req() req: Request, @Body() body: UpdateProfileDto) {
    const payload = req.customerPayload as CustomerTokenPayload;
    const customerService = getCustomerService();

    const customer = await customerService.getCustomer(payload.sub);
    if (customer?.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const { dob, ...rest } = body;

    const result = await customerService.updateCustomer(payload.sub, {
      ...rest,
      dob: dob ? new Date(dob) : dob === null ? null : undefined,
      gender: body.gender ?? undefined,
      description: body.description ?? undefined,
    });

    return {
      data: result,
    };
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Request a password reset email" })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 201, description: "Password reset email dispatch requested", type: GenericMessageResponseDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const authService = getCustomerAuthService();
    // Intentionally does not reveal whether the email exists (security best practice)
    await authService.forgotPassword(body.email).catch(() => {});
    return {
      data: { message: "If this email exists, we have sent a password reset link." },
    };
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Reset password using verification token" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: "Password reset completed successfully", type: CustomerAuthResponseDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const authService = getCustomerAuthService();
    const result = await authService.resetPassword(body.token, body.password);
    return {
      data: result,
    };
  }

  @Post("change-password")
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change customer password" })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 201, description: "Password changed successfully", type: GenericSuccessResponseDto })
  async changePassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    const payload = req.customerPayload as CustomerTokenPayload;
    const authService = getCustomerAuthService();

    await authService.changePassword(payload.sub, body.oldPassword, body.newPassword);
    return {
      data: { success: true },
    };
  }

  @Post("logout")
  @ApiOperation({ summary: "Log out customer (blacklist refresh token)" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 201, description: "Customer logged out successfully", type: GenericSuccessResponseDto })
  async logout(@Body() body: RefreshTokenDto) {
    const tokenService = getCustomerTokenService();
    try {
      const payload = await tokenService.verifyRefreshToken(body.refreshToken);
      // Blacklist token for up to 30 days
      const secondsIn30Days = 30 * 24 * 60 * 60;
      if (payload.jti) {
        await tokenService.blacklistToken(payload.jti, secondsIn30Days);
      }
    } catch {
      // Ignore if expired
    }
    return {
      data: { success: true },
    };
  }
}
