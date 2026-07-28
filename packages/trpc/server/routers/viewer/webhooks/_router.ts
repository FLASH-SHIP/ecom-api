import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  availableEvents,
  createWebhook,
  deleteWebhook,
  getWebhook,
  getWebhookLogs,
  listWebhooks,
  updateWebhook,
} from "./procedures/webhooks.handler";

export const webhooksRouter = router({
  list: listWebhooks,
  get: getWebhook,
  availableEvents,
  create: createWebhook,
  update: updateWebhook,
  delete: deleteWebhook,
  logs: getWebhookLogs,
});
