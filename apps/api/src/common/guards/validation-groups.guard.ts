import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: NestJS requires runtime class reference for decorator metadata reflection
import { Reflector } from "@nestjs/core";
import { VALIDATION_GROUPS_KEY } from "../decorators/validation-groups.decorator";

@Injectable()
export class ValidationGroupsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Resolve groups from the handler, fallback to the controller class
    const groups = this.reflector.getAllAndOverride<string[]>(VALIDATION_GROUPS_KEY, [
      handler,
      controller,
    ]);

    if (groups) {
      request.validationGroups = groups;
    }

    return true;
  }
}
