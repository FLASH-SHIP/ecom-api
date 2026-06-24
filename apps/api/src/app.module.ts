import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TraceLoggerMiddleware } from "./common/middleware/trace-logger.middleware";
import { validate } from "./env";
import { AuthModule } from "./modules/auth/auth.module";
import { BlogModule } from "./modules/blog/blog.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { CustomerAuthModule } from "./modules/customer-auth/customer-auth.module";
import { HealthModule } from "./modules/health/health.module";
import { QueuesModule } from "./modules/queues/queues.module";
import { MediaModule } from "./modules/media/media.module";
// import { MemberAuthModule } from "./modules/member-auth/member-auth.module";
import { RequestLoggerMiddleware } from "./modules/request-logger/request-logger.middleware";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    AuthModule,
    BlogModule,
    CommentsModule,
    ContactsModule,
    HealthModule,
    CustomerAuthModule,
    MediaModule,
    // MemberAuthModule,
    UsersModule,
    QueuesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply TraceLoggerMiddleware first to wrap AsyncLocalStorage, then persist requests
    consumer.apply(TraceLoggerMiddleware, RequestLoggerMiddleware).forRoutes("*");
  }
}
