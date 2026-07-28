import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { create, get, list, remove, tree, types, update } from "./procedures/taxonomies.handler";

export const taxonomiesRouter = router({ list, get, tree, types, create, update, remove });
