import { router } from "../../../trpc";
import { create, get, list, remove, restore, tree, update } from "./procedures/categories.handler";

export const categoriesRouter = router({
  list,
  tree,
  get,
  create,
  update,
  remove,
  restore,
});
