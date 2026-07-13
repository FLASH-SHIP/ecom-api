import { router } from "@ecom/trpc/server/trpc";
import { calculateFreight, create, get, list } from "./procedures/orders.handler";

export const customerOrdersRouter = router({
  calculateFreight,
  create,
  list,
  get,
});

export type CustomerOrdersRouter = typeof customerOrdersRouter;
