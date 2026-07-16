import { Global, Module } from "@nestjs/common";
import { ApiAuthGuard } from "./api-auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { AuthController } from "./auth.controller";

@Global()
@Module({
  controllers: [AuthController],
  providers: [ApiAuthGuard, PermissionsGuard],
  exports: [ApiAuthGuard, PermissionsGuard],
})
export class AuthModule {}
