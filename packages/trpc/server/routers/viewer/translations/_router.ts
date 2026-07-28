import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  batchTranslationStatus,
  deleteTranslation,
  getTranslation,
  languages,
  listTranslations,
  saveTranslation,
  translationStatus,
} from "./procedures/translations.handler";

export const translationsRouter = router({
  languages,
  get: getTranslation,
  list: listTranslations,
  save: saveTranslation,
  delete: deleteTranslation,
  translationStatus,
  batchTranslationStatus,
});
