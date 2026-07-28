import { router } from "@flash-ship/ecom-trpc/server/trpc";
import { changePasswordSelf } from "./procedures/changePasswordSelf.handler";
import { getPreferences } from "./procedures/getPreferences.handler";
import { getUserProfile } from "./procedures/getUserProfile.handler";
import { me } from "./procedures/me.handler";
import { updatePreferences } from "./procedures/updatePreferences.handler";
import { updateProfile } from "./procedures/updateProfile.handler";

export const authRouter = router({
  me,
  getUserProfile,
  updateProfile,
  changePasswordSelf,
  getPreferences,
  updatePreferences,
});
