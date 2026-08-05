import { router } from "../../../trpc";
import {
  acceptTerms,
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
  acceptTerms,
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
