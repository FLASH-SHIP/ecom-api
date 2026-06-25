import type { CustomerTokenPayload } from "@ecom/features/customer/services/CustomerTokenService";
import {
  getCustomerAuthService,
  getCustomerService,
  getCustomerTokenService,
} from "@ecom/features/di/containers/CustomerService";
import { ErrorWithCode } from "@ecom/lib/errors";
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CustomerJwtGuard } from "./customer-jwt.guard";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  SendCodeDto,
  UpdateProfileDto,
} from "./dto";

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
  async sendCode(@Body() body: SendCodeDto) {
    const authService = getCustomerAuthService();
    await authService.sendVerificationCode(body.email);
    return {
      data: { success: true },
    };
  }

  @Post("register")
  @ApiOperation({ summary: "Register a new customer account" })
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
  @ApiOperation({ summary: "Authenticate and log in customer" })
  async login(@Body() body: LoginDto) {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    const customer = await authService.login(body.identifier, body.password);
    const tokens = tokenService.generateTokens(customer);
    return {
      data: { customer, ...tokens },
    };
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access and refresh token pair" })
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
  @ApiOperation({ summary: "Update customer profile information" })
  async updateProfile(@Body() body: UpdateProfileDto) {
    const tokenService = getCustomerTokenService();
    const customerService = getCustomerService();

    const payload = await tokenService.verifyAccessToken(body.accessToken);
    const customer = await customerService.getCustomer(payload.sub);
    if (customer?.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const { accessToken: _, dob, ...rest } = body;

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
  async resetPassword(@Body() body: ResetPasswordDto) {
    const authService = getCustomerAuthService();
    const result = await authService.resetPassword(body.token, body.password);
    return {
      data: result,
    };
  }

  @Post("change-password")
  @ApiOperation({ summary: "Change customer password" })
  async changePassword(@Body() body: ChangePasswordDto) {
    const tokenService = getCustomerTokenService();
    const authService = getCustomerAuthService();

    const payload = await tokenService.verifyAccessToken(body.accessToken);
    await authService.changePassword(payload.sub, body.oldPassword, body.newPassword);
    return {
      data: { success: true },
    };
  }

  @Post("logout")
  @ApiOperation({ summary: "Log out customer (blacklist refresh token)" })
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
