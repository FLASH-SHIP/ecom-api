import { router } from "../../../trpc";
import { addCheckpoint, get, list, purchaseLabel, recalculate, updateStatus, voidLabel } from "./procedures/orders.handler";

export const adminOrdersRouter = router({
  list,
  get,
  updateStatus,
  addCheckpoint,
  recalculate,
  purchaseLabel,
  voidLabel,
});

export type AdminOrdersRouter = typeof adminOrdersRouter;
