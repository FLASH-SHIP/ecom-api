import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  create,
  get,
  list,
  permissions,
  remove,
  syncPermissions,
  update,
} from "./procedures/roles.handler";

export const rolesRouter = router({
  list,
  get,
  create,
  update,
  remove,
  syncPermissions,
  permissions,
});
