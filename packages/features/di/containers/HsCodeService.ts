import { HsCodeRepository } from "@ecom/features/hscode/repositories/HsCodeRepository";
import { HsCodeService } from "@ecom/features/hscode/services/HsCodeService";
import { prisma } from "@ecom/prisma";

let _hsCodeRepository: HsCodeRepository | null = null;
let _hsCodeService: HsCodeService | null = null;

export function getHsCodeRepository(): HsCodeRepository {
  if (!_hsCodeRepository) {
    _hsCodeRepository = new HsCodeRepository(prisma);
  }
  return _hsCodeRepository;
}

export function getHsCodeService(): HsCodeService {
  if (!_hsCodeService) {
    _hsCodeService = new HsCodeService({
      hsCodeRepo: getHsCodeRepository(),
    });
  }
  return _hsCodeService;
}

export function resetHsCodeContainers(): void {
  _hsCodeRepository = null;
  _hsCodeService = null;
}
