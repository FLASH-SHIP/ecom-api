import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  changePassword,
  checkUsername,
  forgotPassword,
  login,
  logout,
  me,
  refreshToken,
  register,
  resetPassword,
  sendVerificationCode,
  updateProfile,
  verifyEmail,
} from "./procedures/auth.handler";

export const customerAuthRouter = router({
  sendVerificationCode,
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
  logout,
});
