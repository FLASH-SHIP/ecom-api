import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PERMISSIONS_KEY } from "./permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.apiUser;

    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }

    const userPermissions = user.permissions ?? [];
    const hasWildcard = userPermissions.includes("*");

    if (hasWildcard) {
      return true;
    }

    for (const requiredPerm of requiredPermissions) {
      if (!userPermissions.includes(requiredPerm)) {
        throw new ForbiddenException(`Missing permission: ${requiredPerm}`);
      }
    }

    return true;
  }
}
