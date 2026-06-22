import { router } from "@ecom/trpc/server/trpc";
import {
  changePassword,
  checkUsername,
  forgotPassword,
  login,
  me,
  refreshToken,
  register,
  resetPassword,
  updateProfile,
  verifyEmail,
} from "./procedures/auth.handler";

export const customerAuthRouter = router({
  register,
  login,
  refreshToken,
  me,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  checkUsername,
});
