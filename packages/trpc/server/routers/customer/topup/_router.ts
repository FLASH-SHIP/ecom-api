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
  getTopupHistory,
  create: createTopupRequest,
  createTopupRequest,
  update: updateTopupRequest,
  updateTopupRequest,
  cancel: cancelTopupRequest,
  cancelTopupRequest,
});
