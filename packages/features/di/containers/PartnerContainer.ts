import { PartnerRepository } from "@ecom/features/partner/repositories/PartnerRepository";
import { PartnerServiceRepository } from "@ecom/features/partner/repositories/PartnerServiceRepository";
import { PartnerService } from "@ecom/features/partner/services/PartnerService";
import { prisma } from "@ecom/prisma";

let _partnerRepository: PartnerRepository | null = null;
let _partnerServiceRepository: PartnerServiceRepository | null = null;
let _partnerService: PartnerService | null = null;

export function getPartnerRepository(): PartnerRepository {
  if (!_partnerRepository) {
    _partnerRepository = new PartnerRepository(prisma);
  }
  return _partnerRepository;
}

export function getPartnerServiceRepository(): PartnerServiceRepository {
  if (!_partnerServiceRepository) {
    _partnerServiceRepository = new PartnerServiceRepository(prisma);
  }
  return _partnerServiceRepository;
}

export function getPartnerService(): PartnerService {
  if (!_partnerService) {
    _partnerService = new PartnerService({
      partnerRepo: getPartnerRepository(),
      partnerServiceRepo: getPartnerServiceRepository(),
    });
  }
  return _partnerService;
}

export function resetPartnerContainers(): void {
  _partnerRepository = null;
  _partnerServiceRepository = null;
  _partnerService = null;
}
