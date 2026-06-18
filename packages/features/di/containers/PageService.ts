import { PageRepository } from "@ecom/features/page/repositories/PageRepository";
import { PageService } from "@ecom/features/page/services/PageService";
import { RevisionRepository } from "@ecom/features/shared/repositories/RevisionRepository";
import { prisma } from "@ecom/prisma";

let _pageRepository: PageRepository | null = null;
let _revisionRepository: RevisionRepository | null = null;
let _pageService: PageService | null = null;

export function getPageRepository(): PageRepository {
  if (!_pageRepository) {
    _pageRepository = new PageRepository(prisma);
  }
  return _pageRepository;
}

export function getRevisionRepository(): RevisionRepository {
  if (!_revisionRepository) {
    _revisionRepository = new RevisionRepository(prisma);
  }
  return _revisionRepository;
}

export function getPageService(): PageService {
  if (!_pageService) {
    _pageService = new PageService({
      pageRepo: getPageRepository(),
      revisionRepo: getRevisionRepository(),
    });
  }
  return _pageService;
}

export function resetPageContainers(): void {
  _pageRepository = null;
  _revisionRepository = null;
  _pageService = null;
}
