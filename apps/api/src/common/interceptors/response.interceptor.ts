import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  meta?: unknown;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    // Avoid intercepting non-HTTP protocols or special cases if any
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();

    // Skip intercepting files or stream downloads if necessary
    if (req.url?.includes("/docs") || req.url?.includes("/swagger")) {
      return next.handle();
    }

    return next.handle().pipe(
      map((val) => {
        // If it's already a standardized structure containing success, return it directly
        if (val && typeof val === "object") {
          if ("success" in val) {
            return val as StandardResponse<T>;
          }
          if ("data" in val) {
            return {
              success: true,
              ...(val as Record<string, unknown>),
            } as StandardResponse<T>;
          }
        }
        return {
          success: true,
          data: val ?? null,
        } as StandardResponse<T>;
      }),
    );
  }
}
