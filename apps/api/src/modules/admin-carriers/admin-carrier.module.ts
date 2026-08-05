import { Module } from "@nestjs/common";
import { AdminCarrierController } from "./admin-carrier.controller";

@Module({
  controllers: [AdminCarrierController],
})
export class AdminCarrierModule {}
