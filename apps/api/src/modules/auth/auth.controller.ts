import { AUTH } from "@flash-ship/ecom-config";
import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { signAccessToken, signRefreshToken } from "@flash-ship/ecom-lib/jwt";
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AdminLoginDto } from "./dto/login.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate and log in admin/member" })
  async login(@Body() body: AdminLoginDto) {
    const authService = getAuthService();
    const user = await authService.validateCredentials(body.email, body.password);

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const payload = {
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 1,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN_SEC,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tokenVersion: user.tokenVersion,
      },
    };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh admin access token" })
  async refresh(@Body() body: { refreshToken: string }) {
    const { verifyRefreshToken } = await import("@flash-ship/ecom-lib/jwt");
    try {
      const payload = verifyRefreshToken(body.refreshToken);
      const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
      return {
        accessToken,
        expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN_SEC,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}
