import { router } from "@ecom/trpc/server/trpc";
import {
  changePassword,
  create,
  get,
  list,
  remove,
  syncRoles,
  update,
} from "./procedures/users.handler";

export const usersRouter = router({
  list,
  get,
  create,
  update,
  changePassword,
  syncRoles,
  remove,
});
