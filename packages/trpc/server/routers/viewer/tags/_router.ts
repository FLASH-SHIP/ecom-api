import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  create,
  get,
  list,
  permanentlyDelete,
  remove,
  restore,
  update,
} from "./procedures/tags.handler";

export const tagsRouter = router({
  list,
  get,
  create,
  update,
  remove,
  restore,
  permanentlyDelete,
});
