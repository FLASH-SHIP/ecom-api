import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  changePassword,
  create,
  get,
  list,
  remove,
  syncRoles,
  toggleSuperAdmin,
  update,
} from "./procedures/users.handler";

export const usersRouter = router({
  list,
  get,
  create,
  update,
  changePassword,
  syncRoles,
  toggleSuperAdmin,
  remove,
});
