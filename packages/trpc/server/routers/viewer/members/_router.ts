import { router } from "@ecom/trpc/server/trpc";
import { create, get, list, remove, stats, update } from "./procedures/members.handler";

export const membersRouter = router({
  list,
  get,
  create,
  update,
  remove,
  stats,
});
