import { Module } from "@nestjs/common";
import { CustomerOrderController } from "./customer-order.controller";

@Module({
  controllers: [CustomerOrderController],
})
export class CustomerOrderModule {}
