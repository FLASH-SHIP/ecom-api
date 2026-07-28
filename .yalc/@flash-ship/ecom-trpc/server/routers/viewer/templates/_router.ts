import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { create, duplicate, get, list, remove, update } from "./procedures/templates.handler";

export const templatesRouter = router({ list, get, create, update, duplicate, remove });
