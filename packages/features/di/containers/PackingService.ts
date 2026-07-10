import { PackingRepository } from "@ecom/features/packing/repositories/PackingRepository";
import { PackingService } from "@ecom/features/packing/services/PackingService";
import { prisma } from "@ecom/prisma";

let _packingRepository: PackingRepository | null = null;
let _packingService: PackingService | null = null;

export function getPackingRepository(): PackingRepository {
  if (!_packingRepository) {
    _packingRepository = new PackingRepository(prisma);
  }
  return _packingRepository;
}

export function getPackingService(): PackingService {
  if (!_packingService) {
    _packingService = new PackingService({
      packingRepo: getPackingRepository(),
    });
  }
  return _packingService;
}

export function resetPackingContainers(): void {
  _packingRepository = null;
  _packingService = null;
}
