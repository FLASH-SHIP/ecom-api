import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { create, get, list, remove, revision, revisions, update } from "./procedures/pages.handler";

export const pagesRouter = router({
  list,
  get,
  create,
  update,
  remove,
  revisions,
  revision,
});
