import { Global, Module } from "@nestjs/common";
import { ApiAuthGuard } from "./api-auth.guard";
import { PermissionsGuard } from "./permissions.guard";

@Global()
@Module({
  providers: [ApiAuthGuard, PermissionsGuard],
  exports: [ApiAuthGuard, PermissionsGuard],
})
export class AuthModule {}
