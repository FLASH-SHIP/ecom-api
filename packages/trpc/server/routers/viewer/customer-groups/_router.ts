import { router } from "@ecom/trpc/server/trpc";
import { create, get, list, listAll, remove, update } from "./procedures/customer-groups.handler";

export const customerGroupsRouter = router({
  list,
  listAll,
  get,
  create,
  update,
  remove,
});
