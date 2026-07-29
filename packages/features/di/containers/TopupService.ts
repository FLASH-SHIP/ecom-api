import { TopupPaymentMethodRepository } from "@ecom/features/topup/repositories/TopupPaymentMethodRepository";
import { TopupExchangeRateRepository } from "@ecom/features/topup/repositories/TopupExchangeRateRepository";
import { TopupTransactionRepository } from "@ecom/features/topup/repositories/TopupTransactionRepository";
import { TopupTransactionService } from "@ecom/features/topup/services/TopupTransactionService";
import { prisma } from "@ecom/prisma";

let _topupPaymentMethodRepository: TopupPaymentMethodRepository | null = null;
let _topupExchangeRateRepository: TopupExchangeRateRepository | null = null;
let _topupTransactionRepository: TopupTransactionRepository | null = null;
let _topupTransactionService: TopupTransactionService | null = null;

export function getTopupTransactionService(): TopupTransactionService {
  if (!_topupTransactionService) {
    _topupPaymentMethodRepository = new TopupPaymentMethodRepository(prisma);
    _topupExchangeRateRepository = new TopupExchangeRateRepository(prisma);
    _topupTransactionRepository = new TopupTransactionRepository(prisma);
    _topupTransactionService = new TopupTransactionService(
      _topupTransactionRepository,
      _topupPaymentMethodRepository,
      _topupExchangeRateRepository,
    );
  }
  return _topupTransactionService;
}

export function resetTopupServiceContainers(): void {
  _topupPaymentMethodRepository = null;
  _topupExchangeRateRepository = null;
  _topupTransactionRepository = null;
  _topupTransactionService = null;
}
