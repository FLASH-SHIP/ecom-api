import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  createReceiver,
  deleteReceiver,
  listReceivers,
  setDefaultReceiver,
  updateReceiver,
} from "./receivers.handler";

export const customerReceiversRouter = router({
  list: listReceivers,
  create: createReceiver,
  update: updateReceiver,
  delete: deleteReceiver,
  setDefault: setDefaultReceiver,
});
