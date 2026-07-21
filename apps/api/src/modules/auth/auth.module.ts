import { Global, Module } from "@nestjs/common";
import { ApiAuthGuard } from "./api-auth.guard";
import { AuthController } from "./auth.controller";
import { PermissionsGuard } from "./permissions.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [ApiAuthGuard, PermissionsGuard],
  exports: [ApiAuthGuard, PermissionsGuard],
})
export class AuthModule {}
