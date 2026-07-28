import { router } from "../../../trpc";
import { bulkSet, get, getAll, getMany, remove, set } from "./procedures/settings.handler";

export const settingsRouter = router({
  getAll,
  get,
  getMany,
  set,
  bulkSet,
  remove,
});
