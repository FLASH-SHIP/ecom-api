import { router } from "@ecom/trpc/server/trpc";
import { calculateFreight, create, get, list, listPackingTypes } from "./procedures/orders.handler";

export const customerOrdersRouter = router({
  calculateFreight,
  create,
  list,
  get,
  listPackingTypes,
});

export type CustomerOrdersRouter = typeof customerOrdersRouter;
