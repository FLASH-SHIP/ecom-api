import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  createSender,
  deleteSender,
  listSenders,
  setDefaultSender,
  updateSender,
} from "./procedures/senders.handler";

export const customerSendersRouter = router({
  list: listSenders,
  create: createSender,
  update: updateSender,
  delete: deleteSender,
  setDefault: setDefaultSender,
});
