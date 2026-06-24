import { loggerContext } from "@ecom/lib/logger";
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user && typeof user === "object" && "id" in user ? Number(user.id) : undefined;

    const store = loggerContext.getStore() || { traceId: "" };

    return new Observable((subscriber) => {
      loggerContext.run({ ...store, userId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
