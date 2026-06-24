import { SetMetadata } from "@nestjs/common";

export interface AuditMetadata {
  action: string;
  entityType?: string;
}

export const AUDIT_METADATA_KEY = "audit_metadata";

/**
 * Decorator to attach audit metadata (action and optional entityType) onto a controller route handler.
 *
 * @example
 * \@Post()
 * \@Audit('CREATE_POST', 'Post')
 * async createPost() { ... }
 */
export const Audit = (action: string, entityType?: string) =>
  SetMetadata(AUDIT_METADATA_KEY, { action, entityType });
