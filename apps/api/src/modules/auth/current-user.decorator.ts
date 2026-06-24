import type { AuthenticatedUser } from "@ecom/features/auth/services/ApiAuthService";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/**
 * Extract the authenticated user from the request.
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.apiUser) {
      throw new Error("CurrentUser decorator used without ApiAuthGuard");
    }
    return request.apiUser;
  },
);
