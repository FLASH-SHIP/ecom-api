import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  addService,
  create,
  deleteService,
  get,
  list,
  listServices,
  remove,
  testConnection,
  update,
  updateService,
} from "./procedures/partners.handler";

export const partnersRouter = router({
  list,
  get,
  create,
  update,
  delete: remove,
  listServices,
  addService,
  updateService,
  deleteService,
  testConnection,
});

export type PartnersRouter = typeof partnersRouter;
