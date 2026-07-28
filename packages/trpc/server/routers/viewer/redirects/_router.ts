import { router } from "../../../trpc";
import { create, list, remove, update } from "./procedures/redirects.handler";

export const redirectsRouter = router({ list, create, update, remove });
