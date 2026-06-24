import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  private readonly maxAge: number;

  constructor(maxAge = 60) {
    this.maxAge = maxAge;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        res.setHeader("Cache-Control", `public, max-age=${this.maxAge}`);
      }),
    );
  }
}
