import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { create, get, list, remove, update } from "./procedures/packing.handler";

export const packingRouter = router({
  list,
  get,
  create,
  update,
  delete: remove,
});
