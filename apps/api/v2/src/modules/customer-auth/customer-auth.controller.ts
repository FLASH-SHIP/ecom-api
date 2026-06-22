import type { CustomerTokenPayload } from "@ecom/features/customer/services/CustomerTokenService";
import {
  getCustomerAuthService,
  getCustomerService,
  getCustomerTokenService,
} from "@ecom/features/di/containers/CustomerService";
import { ErrorWithCode } from "@ecom/lib/errors";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
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

@Controller("v2/customer/auth")
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
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  @Post("register")
  async register(@Body() body: RegisterDto) {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    try {
      const customer = await authService.register({
        email: body.email,
        password: body.password,
        username: body.username,
        name: body.name,
      });
      const tokens = tokenService.generateTokens(customer);
      return { customer, ...tokens };
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        if (error.message.includes("already registered") || error.message.includes("Conflict")) {
          throw new BadRequestException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    try {
      const customer = await authService.login(body.identifier, body.password);
      const tokens = tokenService.generateTokens(customer);
      return { customer, ...tokens };
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        if (error.message.toLowerCase().includes("invalid credentials")) {
          throw new UnauthorizedException(error.message);
        }
        if (error.message.toLowerCase().includes("not active")) {
          throw new ForbiddenException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post("refresh")
  async refreshToken(@Body() body: RefreshTokenDto) {
    const tokenService = getCustomerTokenService();

    try {
      const payload = tokenService.verifyRefreshToken(body.refreshToken);
      const tokens = tokenService.generateTokens({ id: payload.sub, email: payload.email });
      return tokens;
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  @Post("update-profile")
  async updateProfile(@Body() body: UpdateProfileDto) {
    const tokenService = getCustomerTokenService();
    const customerService = getCustomerService();

    try {
      const payload = tokenService.verifyAccessToken(body.accessToken);
      const { accessToken: _, dob, ...rest } = body;

      const result = await customerService.updateCustomer(payload.sub, {
        ...rest,
        dob: dob ? new Date(dob) : dob === null ? null : undefined,
        gender: body.gender ?? undefined,
        description: body.description ?? undefined,
      });

      return result;
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        if (error.message.toLowerCase().includes("forbidden")) {
          throw new ForbiddenException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const authService = getCustomerAuthService();
    // Intentionally does not reveal whether the email exists (security best practice)
    await authService.forgotPassword(body.email).catch(() => {});
    return { message: "If this email exists, we have sent a password reset link." };
  }

  @Post("reset-password")
  async resetPassword(@Body() body: ResetPasswordDto) {
    const authService = getCustomerAuthService();

    try {
      return await authService.resetPassword(body.token, body.password);
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("Invalid or expired reset token");
    }
  }

  @Post("change-password")
  async changePassword(@Body() body: ChangePasswordDto) {
    const tokenService = getCustomerTokenService();
    const authService = getCustomerAuthService();

    try {
      const payload = tokenService.verifyAccessToken(body.accessToken);
      await authService.changePassword(payload.sub, body.oldPassword, body.newPassword);
      return { success: true };
    } catch (error) {
      if (error instanceof ErrorWithCode) {
        if (error.message.toLowerCase().includes("incorrect")) {
          throw new BadRequestException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
