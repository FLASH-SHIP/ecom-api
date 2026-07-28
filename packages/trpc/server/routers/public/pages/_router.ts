import { router } from "../../../trpc";
import { getBySlug, list } from "./procedures/pages.handler";

export const publicPagesRouter = router({
  list,
  getBySlug,
});
