import { Module } from "@nestjs/common";
import { MemberAuthController } from "./member-auth.controller";

@Module({
  controllers: [MemberAuthController],
})
export class MemberAuthModule {}
