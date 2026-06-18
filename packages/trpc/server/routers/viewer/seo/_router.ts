import { router } from "@ecom/trpc/server/trpc";
import { getSeoMeta, saveSeoMeta } from "./procedures/seo.handler";

export const seoRouter = router({
  get: getSeoMeta,
  save: saveSeoMeta,
});
