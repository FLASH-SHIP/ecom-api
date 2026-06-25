import {
  type ArgumentMetadata,
  Inject,
  Injectable,
  Scope,
  ValidationPipe,
  type ValidationPipeOptions,
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";

@Injectable({ scope: Scope.REQUEST })
export class DynamicValidationPipe extends ValidationPipe {
  constructor(
    @Inject(REQUEST) private readonly request: Record<string, unknown>,
    options?: ValidationPipeOptions,
  ) {
    super(options);
  }

  override async transform(value: unknown, metadata: ArgumentMetadata) {
    // 1. Get groups set by ValidationGroupsGuard
    let groups = this.request?.validationGroups as string[] | undefined;

    // 2. Dynamic payload-based groups (e.g. formSlug value)
    if (
      !groups &&
      value &&
      typeof value === "object" &&
      "formSlug" in value &&
      typeof (value as Record<string, unknown>).formSlug === "string"
    ) {
      groups = [(value as Record<string, unknown>).formSlug as string];
    }

    // 3. Fallback based on HTTP method
    if (!groups) {
      const method = this.request?.method as string | undefined;
      if (method === "POST") {
        groups = ["create"];
      } else if (method === "PUT" || method === "PATCH") {
        groups = ["update"];
      }
    }

    if (groups && groups.length > 0) {
      const originalOptions = { ...this.validatorOptions };
      this.validatorOptions.groups = groups;
      try {
        return await super.transform(value, metadata);
      } finally {
        this.validatorOptions.groups = originalOptions.groups;
      }
    }

    return super.transform(value, metadata);
  }
}
