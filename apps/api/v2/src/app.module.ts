import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { BlogModule } from "./modules/blog/blog.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { CustomerAuthModule } from "./modules/customer-auth/customer-auth.module";
import { HealthModule } from "./modules/health/health.module";
import { MediaModule } from "./modules/media/media.module";
import { MemberAuthModule } from "./modules/member-auth/member-auth.module";
import { RequestLoggerMiddleware } from "./modules/request-logger/request-logger.middleware";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../../.env",
    }),
    AuthModule,
    BlogModule,
    CommentsModule,
    ContactsModule,
    HealthModule,
    CustomerAuthModule,
    MediaModule,
    MemberAuthModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Log all routes — middleware itself filters to status >= 400 only
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
