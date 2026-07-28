import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  createPackage,
  deletePackage,
  listPackages,
  setDefaultPackage,
  updatePackage,
} from "./procedures/packages.handler";

export const customerPackagesRouter = router({
  list: listPackages,
  create: createPackage,
  update: updatePackage,
  delete: deletePackage,
  setDefault: setDefaultPackage,
});
