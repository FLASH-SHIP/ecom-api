import { router } from "@flash-ship/ecom-trpc/server/trpc";
import {
  auditHistory,
  checkUsername,
  create,
  get,
  list,
  remove,
  setPassword,
  stats,
  update,
  verificationCodesList,
  verifyEmail,
} from "./procedures/customers.handler";

export const customersRouter = router({
  list,
  get,
  create,
  update,
  remove,
  stats,
  checkUsername,
  verifyEmail,
  setPassword,
  auditHistory,
  verificationCodesList,
});
