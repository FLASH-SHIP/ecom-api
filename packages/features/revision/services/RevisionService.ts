import type { RevisionRepository } from "@ecom/features/revision/repositories/RevisionRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("RevisionService");

const MAX_REVISIONS_PER_ENTITY = 30;

export interface IRevisionServiceDeps {
  revisionRepo: RevisionRepository;
}

export class RevisionService {
  private deps: IRevisionServiceDeps;
  constructor(deps: IRevisionServiceDeps) {
    this.deps = deps;
  }

  /**
   * Create a new revision snapshot for a post or page.
   * Automatically prunes old revisions beyond the limit.
   */
  async createRevision(data: {
    referenceId: number;
    referenceType: "post" | "page";
    title: string;
    content?: string;
    authorId: string;
    note?: string;
  }) {
    const revision = await this.deps.revisionRepo.create(data);

    log.info("Revision created", {
      revisionId: revision.id,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
    });

    // Prune old revisions asynchronously
    this.deps.revisionRepo
      .deleteOldRevisions(data.referenceId, data.referenceType, MAX_REVISIONS_PER_ENTITY)
      .catch((err) => {
        log.warn("Failed to prune old revisions", {
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return revision;
  }

  /**
   * List all revisions for a given entity.
   */
  async listRevisions(referenceId: number, referenceType: "post" | "page") {
    return this.deps.revisionRepo.findByReference(referenceId, referenceType);
  }

  /**
   * Get a specific revision by ID with full content.
   */
  async getRevision(id: number) {
    const revision = await this.deps.revisionRepo.findById(id);
    if (!revision) {
      throw ErrorWithCode.Factory.NotFound("Revision not found");
    }
    return revision;
  }
}
