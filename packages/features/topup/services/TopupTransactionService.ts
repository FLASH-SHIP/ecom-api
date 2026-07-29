import type { FilterTopupHistoryParams, TopupTransactionRepository } from "../repositories/TopupTransactionRepository";
import type { TopupPaymentMethodRepository } from "../repositories/TopupPaymentMethodRepository";
import type { TopupExchangeRateRepository } from "../repositories/TopupExchangeRateRepository";
import { mapTopupPaymentMethodToResponse, mapTopupTransactionToResponse } from "../mappers/mapToCustomerTopupResponse";

export class TopupTransactionService {
  constructor(
    private transactionRepo: TopupTransactionRepository,
    private paymentMethodRepo: TopupPaymentMethodRepository,
    private exchangeRateRepo: TopupExchangeRateRepository,
  ) {}

  async getWalletSummary(customerId: string) {
    return this.transactionRepo.getWalletSummary(customerId);
  }

  async getPaymentMethods(customerId: string) {
    const list = await this.paymentMethodRepo.getPaymentMethodsForCustomer(customerId);
    return list.map(mapTopupPaymentMethodToResponse);
  }

  async getLatestExchangeRate() {
    const rateItem = await this.exchangeRateRepo.getLatestExchangeRate();
    return rateItem ? Number(rateItem.rate) : 25400; // Fallback default USD rate
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
    // Generate unique transaction code e.g. TOP-20260729-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const transactionCode = `TOP-${dateStr}-${randomSuffix}`;

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
