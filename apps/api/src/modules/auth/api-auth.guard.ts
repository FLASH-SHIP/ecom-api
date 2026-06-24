import type { AuthenticatedUser } from "@ecom/features/auth/services/ApiAuthService";
import { getApiAuthService } from "@ecom/features/di/containers/AuthService";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      apiUser?: AuthenticatedUser;
    }
  }
}

/**
 * API Auth Guard — Dual-strategy authentication.
 *
 * Flow:
 *   Request → Has Bearer token?
 *   ├── Token starts with "ecom_"? → API Key strategy
 *   ├── Otherwise? → JWT Access Token strategy
 *   └── No Bearer? → 401 Unauthorized
 */
@Injectable()
export class ApiAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException("Empty Bearer token");
    }

    try {
      const apiAuthService = getApiAuthService();
      request.apiUser = await apiAuthService.authenticateBearer(token);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      throw new UnauthorizedException(message);
    }
  }
}
