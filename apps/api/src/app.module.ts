import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE, REQUEST } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import jwtConfig from "./common/config/jwt.config";
import { I18nValidationException } from "./common/exceptions/i18n-validation.exception";
import { AuthContextThrottlerGuard } from "./common/guards/auth-context-throttler.guard";
import { ValidationGroupsGuard } from "./common/guards/validation-groups.guard";
import { HttpClientModule } from "./common/http/http-client.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor";
import { UserContextInterceptor } from "./common/interceptors/user-context.interceptor";
import { TraceLoggerMiddleware } from "./common/middleware/trace-logger.middleware";
import { DynamicValidationPipe } from "./common/pipes/dynamic-validation.pipe";
import { SeedService } from "./common/seed/seed.service";
import { RedisThrottlerStorage } from "./common/throttler/redis-throttler-storage.service";
import { IsUniqueConstraint } from "./common/validators/is-unique.validator";
import { validate } from "./env";
import { AuthModule } from "./modules/auth/auth.module";
import { BlogModule } from "./modules/blog/blog.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { CustomerAuthModule } from "./modules/customer-auth/customer-auth.module";
import { HealthModule } from "./modules/health/health.module";
// import { MemberAuthModule } from "./modules/member-auth/member-auth.module";
import { HsCodeModule } from "./modules/hscode/hscode.module";
import { MediaModule } from "./modules/media/media.module";
import { QueuesModule } from "./modules/queues/queues.module";
import { RequestLoggerMiddleware } from "./modules/request-logger/request-logger.middleware";
import { UsersModule } from "./modules/users/users.module";
import { SystemModule } from "./modules/system/system.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate,
      load: [jwtConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ],
      storage: new RedisThrottlerStorage(),
    }),
    AuthModule,
    BlogModule,
    CommentsModule,
    ContactsModule,
    HealthModule,
    CustomerAuthModule,
    HsCodeModule,
    MediaModule,
    // MemberAuthModule,
    UsersModule,
    QueuesModule,
    HttpClientModule,
    SystemModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthContextThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ValidationGroupsGuard,
    },
    {
      provide: APP_PIPE,
      useFactory: (request: Record<string, unknown>) => {
        return new DynamicValidationPipe(request, {
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          exceptionFactory: (errors) => new I18nValidationException(errors),
        });
      },
      inject: [REQUEST],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
    IsUniqueConstraint,
    SeedService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply TraceLoggerMiddleware first to wrap AsyncLocalStorage, then persist requests
    consumer.apply(TraceLoggerMiddleware, RequestLoggerMiddleware).forRoutes("*");
  }
}
