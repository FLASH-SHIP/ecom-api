import { router } from "@ecom/trpc/server/trpc";
import { create, get, list, remove, update } from "./procedures/tags.handler";

export const tagsRouter = router({
  list,
  get,
  create,
  update,
  remove,
});
