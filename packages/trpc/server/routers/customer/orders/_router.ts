import { router } from "@ecom/trpc/server/trpc";
import {
  completeImportSession,
  createImportSession,
  getImportSessionDetail,
  importBatch,
  listImportSessions,
} from "./procedures/import.handler";
import { calculateFreight, create, get, list } from "./procedures/orders.handler";

export const customerOrdersRouter = router({
  calculateFreight,
  create,
  list,
  get,
  createImportSession,
  importBatch,
  completeImportSession,
  listImportSessions,
  getImportSessionDetail,
});

export type CustomerOrdersRouter = typeof customerOrdersRouter;
