import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  create,
  getActive,
  getById,
  getDefault,
  getRelatedItems,
  list,
  remove,
  saveContentLanguage,
  setDefault,
  update,
  worldLanguages,
} from "./procedures/languages.handler";

export const languagesRouter = router({
  list,
  getActive,
  getById,
  getDefault,
  create,
  update,
  delete: remove,
  setDefault,
  getRelatedItems,
  saveContentLanguage,
  worldLanguages,
});
