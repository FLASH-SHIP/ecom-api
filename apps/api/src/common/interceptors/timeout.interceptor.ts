import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
import { type Observable, TimeoutError, throwError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(10000), // 10 seconds timeout limit
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException("Yêu cầu xử lý quá thời gian quy định (10s)"),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
