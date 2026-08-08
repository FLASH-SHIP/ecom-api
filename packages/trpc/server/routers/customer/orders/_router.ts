import { router } from "../../../trpc";
import {
  completeImportSession,
  createImportSession,
  getImportSessionDetail,
  importBatch,
  listImportSessions,
} from "./procedures/import.handler";
import {
  bulkCreate,
  calculateFreight,
  create,
  exportExcel,
  get,
  getShippingLimit,
  list,
  listPackingTypes,
} from "./procedures/orders.handler";

export const customerOrdersRouter = router({
  calculateFreight,
  getShippingLimit,
  create,
  bulkCreate,
  list,
  get,
  exportExcel,
  createImportSession,
  importBatch,
  completeImportSession,
  listImportSessions,
  getImportSessionDetail,
  listPackingTypes,
});

export type CustomerOrdersRouter = typeof customerOrdersRouter;
