import { Module } from "@nestjs/common";
import { CustomerWebhookController } from "./customer-webhook.controller";

@Module({
  controllers: [CustomerWebhookController],
})
export class CustomerWebhookModule {}
