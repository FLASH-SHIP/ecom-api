import { Module } from "@nestjs/common";
import { HsCodeController } from "./hscode.controller";

@Module({
  controllers: [HsCodeController],
})
export class HsCodeModule {}
