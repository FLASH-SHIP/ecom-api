import type { CustomerTokenPayload } from "@ecom/features/customer/services/CustomerTokenService";
import {
  getCustomerAuthService,
  getCustomerService,
  getCustomerTokenService,
} from "@ecom/features/di/containers/CustomerService";
import { ErrorWithCode } from "@ecom/lib/errors";
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import type { Request } from "express";
import { CustomerJwtGuard } from "./customer-jwt.guard";

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_.]{3,30}$/, {
    message:
      "Username must be 3-30 characters, only lowercase letters, numbers, dots and underscores",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}

class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_.]{3,30}$/, {
    message:
      "Username must be 3-30 characters, only lowercase letters, numbers, dots and underscores",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  dob?: string | null;

  @IsOptional()
  @IsString()
  gender?: "male" | "female" | "other" | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}

@Controller("customer/auth")
export class CustomerAuthController {
  // ─── Profile ──────────────────────────────────────────────────────────────

  /**
   * GET /v2/customer/auth/me
   * Returns the authenticated customer's profile.
   * Requires: Authorization: Bearer <accessToken>
   */
  @Get("me")
  @UseGuards(CustomerJwtGuard)
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
  @Post("register")
  async register(@Body() body: RegisterDto) {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    const customer = await authService.register({
      email: body.email,
      password: body.password,
      username: body.username,
      name: body.name,
    });
    const tokens = tokenService.generateTokens(customer);
    return {
      data: { customer, ...tokens },
    };
  }

  @Post("login")
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
  async refreshToken(@Body() body: RefreshTokenDto) {
    const tokenService = getCustomerTokenService();

    const payload = await tokenService.verifyRefreshToken(body.refreshToken);

    const customer = await getCustomerService().getCustomer(payload.sub);
    if (!customer || customer.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("Account is not active");
    }

    const tokens = tokenService.generateTokens({ id: payload.sub, email: payload.email });
    return {
      data: tokens,
    };
  }

  @Post("update-profile")
  async updateProfile(@Body() body: UpdateProfileDto) {
    const tokenService = getCustomerTokenService();
    const customerService = getCustomerService();

    const payload = await tokenService.verifyAccessToken(body.accessToken);
    const customer = await customerService.getCustomer(payload.sub);
    if (!customer || customer.status !== "ACTIVE") {
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
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const authService = getCustomerAuthService();
    // Intentionally does not reveal whether the email exists (security best practice)
    await authService.forgotPassword(body.email).catch(() => {});
    return {
      data: { message: "If this email exists, we have sent a password reset link." },
    };
  }

  @Post("reset-password")
  async resetPassword(@Body() body: ResetPasswordDto) {
    const authService = getCustomerAuthService();
    const result = await authService.resetPassword(body.token, body.password);
    return {
      data: result,
    };
  }

  @Post("change-password")
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
