import { router } from "../../../trpc";
import {
  adjustTopupRequest,
  approveTopupRequest,
  cancelTopupRequest,
  createTopupRequest,
  exportExcel,
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
  adjust: adjustTopupRequest,
  adjustTopupRequest,
  approve: approveTopupRequest,
  approveTopupRequest,
  exportExcel,
});
