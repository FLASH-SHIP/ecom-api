import type { ContentStatus } from "@ecom/prisma";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";

/**
 * Defines valid workflow transitions for content.
 *
 * Flow: DRAFT → PENDING → REVIEW → PUBLISHED
 *                              ↘ REJECTED → DRAFT (restart)
 *       Any → ARCHIVED
 *       PUBLISHED → DRAFT (unpublish)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING", "PUBLISHED", "ARCHIVED"],
  PENDING: ["REVIEW", "DRAFT", "ARCHIVED"],
  REVIEW: ["PUBLISHED", "REJECTED", "DRAFT", "ARCHIVED"],
  REJECTED: ["DRAFT", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export class WorkflowService {
  /**
   * Validates whether a status transition is allowed.
   * Returns true if the transition is valid.
   */
  canTransition(from: ContentStatus, to: ContentStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  /**
   * Validates a status transition. Throws if invalid.
   */
  validateTransition(from: ContentStatus, to: ContentStatus): void {
    if (!this.canTransition(from, to)) {
      throw ErrorWithCode.Factory.BadRequest(`Invalid status transition: ${from} → ${to}`);
    }
  }

  /**
   * Returns the list of statuses that are reachable from the given status.
   */
  getAvailableTransitions(from: ContentStatus): string[] {
    return VALID_TRANSITIONS[from] ?? [];
  }

  /**
   * Returns a human-readable description of the workflow.
   */
  getWorkflowDescription(): Record<string, string> {
    return {
      DRAFT: "Content is being written. Can be submitted for review or published directly.",
      PENDING: "Submitted for editorial review. Waiting for an editor to pick it up.",
      REVIEW: "Under active review by an editor. Can be approved or rejected.",
      REJECTED: "Rejected by editor. Author can revise and re-submit.",
      PUBLISHED: "Live and visible to the public.",
      ARCHIVED: "Taken offline. Can be restored to draft.",
    };
  }
}

let instance: WorkflowService | null = null;

export function getWorkflowService(): WorkflowService {
  if (!instance) {
    instance = new WorkflowService();
  }
  return instance;
}
