import { router } from "../../../trpc";
import {
  createDivision,
  createProvince,
  createWard,
  deleteProvince,
  deleteWard,
  getDivision,
  getProvince,
  getWard,
  listDivisions,
  listProvinces,
  listWards,
  updateDivision,
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
  listDivisions,
  getDivision,
  createDivision,
  updateDivision,
});
