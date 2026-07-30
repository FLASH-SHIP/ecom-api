import type { FilterTopupHistoryParams, TopupTransactionRepository } from "../repositories/TopupTransactionRepository";
import type { TopupPaymentMethodRepository } from "../repositories/TopupPaymentMethodRepository";
import type { TopupExchangeRateRepository } from "../repositories/TopupExchangeRateRepository";
import { mapTopupPaymentMethodToResponse, mapTopupTransactionToResponse } from "../mappers/mapToCustomerTopupResponse";
import { generateEntityCode } from "@flash-ship/ecom-lib";
import { ExternalWalletClient } from "../clients/ExternalWalletClient";
import { ExternalWalletActionType } from "../dtos/externalWalletDTOs";

export class TopupTransactionService {
  constructor(
    private transactionRepo: TopupTransactionRepository,
    private paymentMethodRepo: TopupPaymentMethodRepository,
    private exchangeRateRepo: TopupExchangeRateRepository,
  ) {}

  async getWalletSummary(customerId: string) {
    const summary = await this.transactionRepo.getWalletSummary(customerId);
    try {
      const walletClient = new ExternalWalletClient();
      const extWallet = await walletClient.getAccountInfo({ partnerId: customerId });
      if (extWallet?.data?.accountBalance !== undefined && extWallet?.data?.accountBalance !== null) {
        summary.accountBalance = Number(extWallet.data.accountBalance);
      }
    } catch (err) {
      // Fallback to local transaction balance if External Wallet service is unavailable
    }
    return summary;
  }

  async getPaymentMethods(customerId: string) {
    const list = await this.paymentMethodRepo.getPaymentMethodsForCustomer(customerId);
    return list.map(mapTopupPaymentMethodToResponse);
  }

  async getLatestExchangeRate(date?: Date) {
    const rateItem = await this.exchangeRateRepo.getExchangeRateByDate(date);
    return rateItem ? Number(rateItem.rate) : 25000; // Default 25.000 VND / 1 USD
  }

  async getTopupHistory(params: FilterTopupHistoryParams) {
    const result = await this.transactionRepo.getTopupHistory(params);
    return {
      data: result.data.map(mapTopupTransactionToResponse),
      meta: result.meta,
    };
  }

  async createTopupRequest(data: {
    customerId: string;
    paymentMethodId: number;
    wireAmount: number;
    description?: string;
    wireDate?: Date;
    wireImages?: string[];
  }) {
    // Generate unique transaction code using generateEntityCode("W") => Wallet
    const transactionCode = generateEntityCode("W");
    const currentRate = await this.getLatestExchangeRate();

    const transaction = await this.transactionRepo.createTopupRequest({
      customerId: data.customerId,
      transactionCode,
      paymentMethodId: data.paymentMethodId,
      wireAmount: data.wireAmount,
      rate: currentRate,
      description: data.description,
      wireDate: data.wireDate,
      wireImages: data.wireImages,
    });

    // Call External Wallet Charging Request API (payment-api/charging-request)
    try {
      const customerCode = await this.transactionRepo.getCustomerCode(data.customerId);
      const walletClient = new ExternalWalletClient();
      await walletClient.chargingRequest({
        fromSystem: "ECOM",
        buyerInfo: {
          partnerId: data.customerId,
          partnerCode: customerCode,
        },
        orderItem: {
          actionType: ExternalWalletActionType.INCREASE, // 1 = cộng tiền (mapped to ExternalWalletActionType enum)
          paymentType: "E_WALLET",
          price: data.wireAmount,
          note: null,
          orderCode: null,
        },
      });
    } catch (err) {
      // Log external wallet charging error
    }

    return mapTopupTransactionToResponse(transaction);
  }

  async updateTopupRequest(
    id: number,
    customerId: string,
    data: {
      paymentMethodId?: number;
      wireAmount?: number;
      description?: string;
      wireDate?: Date;
      wireImages?: string[];
    },
  ) {
    const updated = await this.transactionRepo.updateTopupRequest(id, customerId, data);
    return mapTopupTransactionToResponse(updated);
  }

  async cancelTopupRequest(id: number, customerId: string) {
    const cancelled = await this.transactionRepo.cancelTopupRequest(id, customerId);
    return mapTopupTransactionToResponse(cancelled);
  }
}
