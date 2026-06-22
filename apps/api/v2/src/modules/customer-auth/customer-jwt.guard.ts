import type { CustomerTokenPayload } from "@ecom/features/customer/services/CustomerTokenService";
import { getCustomerTokenService } from "@ecom/features/di/containers/CustomerService";
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
      // Injected by CustomerJwtGuard — available in any endpoint protected by it
      customerPayload?: CustomerTokenPayload;
    }
  }
}

/**
 * Guard for customer-facing endpoints authenticated via customer JWT access tokens.
 *
 * Distinct from ApiAuthGuard (which handles admin users + API keys).
 * Customer tokens use the payload shape: { sub: number, email: string, type: "access" }
 */
@Injectable()
export class CustomerJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
      const payload = getCustomerTokenService().verifyAccessToken(token);
      request.customerPayload = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
