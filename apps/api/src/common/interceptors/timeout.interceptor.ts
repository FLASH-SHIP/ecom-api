import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { type Observable, TimeoutError, throwError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { TIMEOUT_KEY } from "../decorators/timeout.decorator";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Resolve timeout: method-level -> class-level -> default
    const customTimeout = this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
      handler,
      controller,
    ]);

    const defaultTimeout = this.configService.get<number>("API_TIMEOUT_MS") ?? 30000;

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
