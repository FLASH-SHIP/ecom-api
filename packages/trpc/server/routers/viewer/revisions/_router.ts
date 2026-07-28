import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { getRevision, listRevisions } from "./procedures/revisions.handler";

export const revisionsRouter = router({
  list: listRevisions,
  get: getRevision,
});
