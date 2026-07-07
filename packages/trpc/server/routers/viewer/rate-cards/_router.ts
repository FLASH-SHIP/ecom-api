import { router } from "@ecom/trpc/server/trpc";
import {
  calculate,
  create,
  duplicate,
  exportSlabsTemplate,
  get,
  importSlabs,
  list,
  listGroups,
  listLogs,
  remove,
  update,
} from "./procedures/rate-cards.handler";

export const rateCardsRouter = router({
  calculate,
  list,
  get,
  create,
  update,
  delete: remove, // Expose as delete procedure
  listLogs,
  importSlabs,
  exportSlabsTemplate,
  listGroups,
  duplicate,
});
export type RateCardsRouter = typeof rateCardsRouter;
