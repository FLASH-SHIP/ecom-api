import { RevisionRepository } from "@ecom/features/revision/repositories/RevisionRepository";
import { RevisionService } from "@ecom/features/revision/services/RevisionService";
import { prisma } from "@ecom/prisma";

let _revisionRepository: RevisionRepository | null = null;
let _revisionService: RevisionService | null = null;

export function getRevisionRepository(): RevisionRepository {
  if (!_revisionRepository) {
    _revisionRepository = new RevisionRepository(prisma);
  }
  return _revisionRepository;
}

export function getRevisionService(): RevisionService {
  if (!_revisionService) {
    _revisionService = new RevisionService({
      revisionRepo: getRevisionRepository(),
    });
  }
  return _revisionService;
}

export function resetRevisionContainers(): void {
  _revisionRepository = null;
  _revisionService = null;
}
