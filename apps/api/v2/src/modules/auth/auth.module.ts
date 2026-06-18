import { Global, Module } from "@nestjs/common";
import { ApiAuthGuard } from "./api-auth.guard";

@Global()
@Module({
  providers: [ApiAuthGuard],
  exports: [ApiAuthGuard],
})
export class AuthModule {}
