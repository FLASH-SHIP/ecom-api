import { router } from "../../../trpc";
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
  socialLogin,
  updateProfile,
  verifyEmail,
} from "./procedures/auth.handler";

export const customerAuthRouter = router({
  sendVerificationCode,
  register,
  socialLogin,
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
