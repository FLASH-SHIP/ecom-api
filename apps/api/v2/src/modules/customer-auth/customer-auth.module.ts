import { Module } from "@nestjs/common";
import { CustomerAuthController } from "./customer-auth.controller";

@Module({
  controllers: [CustomerAuthController],
})
export class CustomerAuthModule {}
