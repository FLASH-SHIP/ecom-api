import { LanguageMetaRepository } from "@ecom/features/language/repositories/LanguageMetaRepository";
import { LanguageRepository } from "@ecom/features/language/repositories/LanguageRepository";
import { LanguageService } from "@ecom/features/language/services/LanguageService";
import { prisma } from "@ecom/prisma";

let _languageRepository: LanguageRepository | null = null;
let _languageMetaRepository: LanguageMetaRepository | null = null;
let _languageService: LanguageService | null = null;

export function getLanguageRepository(): LanguageRepository {
  if (!_languageRepository) {
    _languageRepository = new LanguageRepository(prisma);
  }
  return _languageRepository;
}

export function getLanguageMetaRepository(): LanguageMetaRepository {
  if (!_languageMetaRepository) {
    _languageMetaRepository = new LanguageMetaRepository(prisma);
  }
  return _languageMetaRepository;
}

export function getLanguageService(): LanguageService {
  if (!_languageService) {
    _languageService = new LanguageService({
      languageRepo: getLanguageRepository(),
      languageMetaRepo: getLanguageMetaRepository(),
    });
  }
  return _languageService;
}

export function resetLanguageContainers(): void {
  _languageRepository = null;
  _languageMetaRepository = null;
  _languageService = null;
}
