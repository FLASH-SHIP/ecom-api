import { router } from "@ecom/trpc/server/trpc";
import { listCities, listProvinces, listStates, listWards } from "./procedures/divisions.handler";

export const customerDivisionsRouter = router({
  listProvinces,
  listWards,
  listStates,
  listCities,
});
