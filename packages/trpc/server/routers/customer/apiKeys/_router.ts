import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { create, list, revoke } from "./procedures/apiKeys.handler";

export const customerApiKeysRouter = router({
  list,
  create,
  revoke,
});

export type CustomerApiKeysRouter = typeof customerApiKeysRouter;
