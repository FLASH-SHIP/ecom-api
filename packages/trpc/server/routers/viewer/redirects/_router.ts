import { router } from "@ecom/trpc/server/trpc";
import { create, list, remove, update } from "./procedures/redirects.handler";

export const redirectsRouter = router({ list, create, update, remove });
