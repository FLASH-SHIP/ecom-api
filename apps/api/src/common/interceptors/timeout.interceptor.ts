import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: need value-level import for NestJS DI metadata
import { ConfigService } from "@nestjs/config";
// biome-ignore lint/style/useImportType: need value-level import for NestJS DI metadata
import { Reflector } from "@nestjs/core";
import { type Observable, TimeoutError, throwError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { TIMEOUT_KEY } from "../decorators/timeout.decorator";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Resolve timeout: method-level -> class-level -> default
    const customTimeout = this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
      handler,
      controller,
    ]);

    const defaultTimeout = this.configService.get<number>("API_TIMEOUT_MS") ?? 10000;

    const timeoutLimit = customTimeout ?? defaultTimeout;

    return next.handle().pipe(
      timeout(timeoutLimit),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Yêu cầu xử lý quá thời gian quy định (${timeoutLimit / 1000}s)`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
