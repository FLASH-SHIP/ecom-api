import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { getActive, getDefault } from "../../viewer/languages/procedures/languages.handler";

export const publicLanguagesRouter = router({
  getActive,
  getDefault,
});
