import { Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import { NotificationWebhookController } from "./notification-webhook.controller";

@Module({
  controllers: [NotificationController, NotificationWebhookController],
})
export class NotificationModule {}
