import { Module } from "@nestjs/common";
import { HscodesController } from "./hscodes.controller";
import { HscodesService } from "./hscodes.service";

@Module({
  controllers: [HscodesController],
  providers: [HscodesService],
  exports: [HscodesService]
})
export class HscodesModule {}
