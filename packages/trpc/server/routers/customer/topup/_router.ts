import { router } from "../../../trpc";
import {
  cancelTopupRequest,
  createTopupRequest,
  getLatestExchangeRate,
  getPaymentMethods,
  getTopupHistory,
  getWalletSummary,
  updateTopupRequest,
} from "./procedures/topup.handler";

export const customerTopupRouter = router({
  getWalletSummary,
  getPaymentMethods,
  getLatestExchangeRate,
  getHistory: getTopupHistory,
  create: createTopupRequest,
  update: updateTopupRequest,
  cancel: cancelTopupRequest,
});
