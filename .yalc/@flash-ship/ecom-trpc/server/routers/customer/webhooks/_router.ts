import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  create,
  list,
  listLogs,
  remove,
  rollSecret,
  testWebhook,
} from "./procedures/webhooks.handler";

export const customerWebhooksRouter = router({
  list,
  create,
  delete: remove,
  rollSecret,
  testWebhook,
  listLogs,
});

export type CustomerWebhooksRouter = typeof customerWebhooksRouter;
