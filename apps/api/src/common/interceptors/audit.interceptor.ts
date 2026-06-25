import { getAuditService } from "@ecom/features/di/containers/AuditService";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AUDIT_METADATA_KEY, type AuditMetadata } from "../decorators/audit.decorator";

function extractEntityId(response: unknown): string | undefined {
  if (!response || typeof response !== "object") return undefined;
  const resObj = response as Record<string, unknown>;
  const dataVal = resObj.data;
  if (dataVal && typeof dataVal === "object") {
    const dataObj = dataVal as Record<string, unknown>;
    return dataObj.id !== undefined ? String(dataObj.id) : undefined;
  }
  return resObj.id !== undefined ? String(resObj.id) : undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const auditMeta = this.reflector.get<AuditMetadata>(AUDIT_METADATA_KEY, context.getHandler());
    const action = auditMeta?.action;
    const entityType = auditMeta?.entityType;

    return next.handle().pipe(
      tap(async (response: unknown) => {
        if (!action) return;
        const auditService = getAuditService();
        const userId = req.apiUser?.id;
        const moduleName = context.getClass().name;
        const entityId = extractEntityId(response);

        await auditService
          .logAction({
            userId,
            action,
            module: moduleName,
            entityId,
            entityType,
            newValues: req.method !== "GET" ? req.body : undefined,
            ipAddress: req.ip ?? req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
            metadata: {
              url: req.originalUrl,
              method: req.method,
            },
          })
          .catch(() => {
            // Non-blocking error handling
          });
      }),
    );
  }
}
