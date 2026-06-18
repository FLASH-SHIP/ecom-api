import { SeoMetaRepository } from "@ecom/features/seo/repositories/SeoMetaRepository";
import { SeoMetaService } from "@ecom/features/seo/services/SeoMetaService";
import { prisma } from "@ecom/prisma";

let _seoMetaRepository: SeoMetaRepository | null = null;
let _seoMetaService: SeoMetaService | null = null;

export function getSeoMetaRepository(): SeoMetaRepository {
  if (!_seoMetaRepository) {
    _seoMetaRepository = new SeoMetaRepository(prisma);
  }
  return _seoMetaRepository;
}

export function getSeoMetaService(): SeoMetaService {
  if (!_seoMetaService) {
    _seoMetaService = new SeoMetaService({
      seoMetaRepo: getSeoMetaRepository(),
    });
  }
  return _seoMetaService;
}

export function resetSeoContainers(): void {
  _seoMetaRepository = null;
  _seoMetaService = null;
}
