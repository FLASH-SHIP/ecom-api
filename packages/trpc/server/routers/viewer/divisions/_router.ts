import { router } from "@ecom/trpc/server/trpc";
import {
  createProvince,
  createWard,
  deleteProvince,
  deleteWard,
  getProvince,
  getWard,
  listProvinces,
  listWards,
  updateProvince,
  updateWard,
} from "./procedures/divisions.handler";

export const divisionsRouter = router({
  listProvinces,
  getProvince,
  createProvince,
  updateProvince,
  deleteProvince,
  listWards,
  getWard,
  createWard,
  updateWard,
  deleteWard,
});
