import { RateCardRepository } from "@ecom/features/rate-card/repositories/RateCardRepository";
import { RateCardService } from "@ecom/features/rate-card/services/RateCardService";
import { prisma } from "@ecom/prisma";

let _rateCardRepository: RateCardRepository | null = null;
let _rateCardService: RateCardService | null = null;

export function getRateCardRepository(): RateCardRepository {
  if (!_rateCardRepository) {
    _rateCardRepository = new RateCardRepository(prisma);
  }
  return _rateCardRepository;
}

export function getRateCardService(): RateCardService {
  if (!_rateCardService) {
    _rateCardService = new RateCardService({
      rateCardRepo: getRateCardRepository(),
    });
  }
  return _rateCardService;
}

export function resetShippingRateContainers(): void {
  _rateCardRepository = null;
  _rateCardService = null;
}
