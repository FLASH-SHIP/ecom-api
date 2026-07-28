import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { getBySlug, list } from "./procedures/pages.handler";

export const publicPagesRouter = router({
  list,
  getBySlug,
});
