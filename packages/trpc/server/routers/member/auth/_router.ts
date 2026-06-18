import { router } from "@ecom/trpc/server/trpc";
import { login, me, refreshToken, register, updateProfile } from "./procedures/auth.handler";

export const memberAuthRouter = router({
  register,
  login,
  refreshToken,
  me,
  updateProfile,
});
