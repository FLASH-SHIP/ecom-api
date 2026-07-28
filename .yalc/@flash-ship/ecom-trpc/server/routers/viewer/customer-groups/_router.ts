import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  assignMembers,
  create,
  get,
  getAvailableCustomers,
  getMembers,
  list,
  listAll,
  remove,
  removeMembers,
  update,
} from "./procedures/customer-groups.handler";

export const customerGroupsRouter = router({
  list,
  listAll,
  get,
  create,
  update,
  remove,
  getMembers,
  getAvailableCustomers,
  assignMembers,
  removeMembers,
});
