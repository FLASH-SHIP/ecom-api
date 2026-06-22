import { router } from "@ecom/trpc/server/trpc";
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
});
