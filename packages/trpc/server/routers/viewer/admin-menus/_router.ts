import { router } from "@ecom/trpc/server/trpc";
import {
  create,
  get,
  list,
  remove,
  reorder,
  tree,
  update,
  upsertTranslation,
} from "./procedures/admin-menus.handler";

export const adminMenusRouter = router({
  tree,
  list,
  get,
  create,
  update,
  remove,
  upsertTranslation,
  reorder,
});
