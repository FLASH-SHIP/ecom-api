import { Module } from "@nestjs/common";
import { DatabaseMaintenanceController } from "./database-maintenance.controller";

@Module({
  controllers: [DatabaseMaintenanceController],
})
export class SystemModule {}
