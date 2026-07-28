import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  approve,
  assignGroups,
  calculate,
  checkOverlap,
  create,
  duplicate,
  exportSlabsTemplate,
  get,
  importSlabs,
  list,
  listGroups,
  listLogs,
  reject,
  remove,
  submitForReview,
  update,
} from "./procedures/rate-cards.handler";

export const rateCardsRouter = router({
  calculate,
  list,
  get,
  create,
  update,
  submitForReview,
  approve,
  reject,
  assignGroups,
  checkOverlap,
  delete: remove, // Expose as delete procedure
  listLogs,
  importSlabs,
  exportSlabsTemplate,
  listGroups,
  duplicate,
});
export type RateCardsRouter = typeof rateCardsRouter;
