import { TranslationRepository } from "@ecom/features/translation/repositories/TranslationRepository";
import { TranslationService } from "@ecom/features/translation/services/TranslationService";
import { prisma } from "@ecom/prisma";

let _translationRepository: TranslationRepository | null = null;
let _translationService: TranslationService | null = null;

export function getTranslationRepository(): TranslationRepository {
  if (!_translationRepository) {
    _translationRepository = new TranslationRepository(prisma);
  }
  return _translationRepository;
}

export function getTranslationService(): TranslationService {
  if (!_translationService) {
    _translationService = new TranslationService({
      translationRepo: getTranslationRepository(),
    });
  }
  return _translationService;
}

export function resetTranslationContainers(): void {
  _translationRepository = null;
  _translationService = null;
}
