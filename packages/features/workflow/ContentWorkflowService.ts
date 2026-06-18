import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("ContentWorkflow");

/**
 * Content workflow states:
 * DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
 *                ↓
 *            REJECTED → DRAFT (revision needed)
 */
export type WorkflowStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PUBLISHED";

export interface WorkflowTransitionResult {
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  reviewerId?: number;
  note?: string;
  timestamp: Date;
}

interface WorkflowHistoryEntry {
  entityType: string;
  entityId: number;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  userId: number;
  userName: string;
  note?: string;
  timestamp: Date;
}

const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: ["PENDING_REVIEW"],
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED", "DRAFT"],
  REJECTED: ["DRAFT"],
  PUBLISHED: ["DRAFT"],
};

/**
 * Content workflow manager — enforces multi-step approval flow.
 *
 * Inspired by WordPress Editorial Flow and Strapi Review Workflows.
 */
export class ContentWorkflowService {
  private history: WorkflowHistoryEntry[] = [];

  /**
   * Submit content for review.
   */
  submitForReview(
    entityType: string,
    entityId: number,
    currentStatus: WorkflowStatus,
    userId: number,
    userName: string,
    note?: string,
  ): WorkflowTransitionResult {
    return this.transition(
      entityType,
      entityId,
      currentStatus,
      "PENDING_REVIEW",
      userId,
      userName,
      note,
    );
  }

  /**
   * Approve content.
   */
  approve(
    entityType: string,
    entityId: number,
    currentStatus: WorkflowStatus,
    reviewerId: number,
    reviewerName: string,
    note?: string,
  ): WorkflowTransitionResult {
    return this.transition(
      entityType,
      entityId,
      currentStatus,
      "APPROVED",
      reviewerId,
      reviewerName,
      note,
    );
  }

  /**
   * Reject content and send back for revision.
   */
  reject(
    entityType: string,
    entityId: number,
    currentStatus: WorkflowStatus,
    reviewerId: number,
    reviewerName: string,
    note?: string,
  ): WorkflowTransitionResult {
    if (!note) {
      throw ErrorWithCode.Factory.BadRequest("A rejection note is required");
    }
    return this.transition(
      entityType,
      entityId,
      currentStatus,
      "REJECTED",
      reviewerId,
      reviewerName,
      note,
    );
  }

  /**
   * Move approved content back to draft (for re-editing).
   */
  returnToDraft(
    entityType: string,
    entityId: number,
    currentStatus: WorkflowStatus,
    userId: number,
    userName: string,
    note?: string,
  ): WorkflowTransitionResult {
    return this.transition(entityType, entityId, currentStatus, "DRAFT", userId, userName, note);
  }

  /**
   * Get workflow history for an entity.
   */
  getHistory(entityType: string, entityId: number): WorkflowHistoryEntry[] {
    return this.history.filter((h) => h.entityType === entityType && h.entityId === entityId);
  }

  /**
   * Check if a transition is valid.
   */
  canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Get available next statuses from current status.
   */
  getAvailableTransitions(currentStatus: WorkflowStatus): WorkflowStatus[] {
    return VALID_TRANSITIONS[currentStatus] ?? [];
  }

  private transition(
    entityType: string,
    entityId: number,
    fromStatus: WorkflowStatus,
    toStatus: WorkflowStatus,
    userId: number,
    userName: string,
    note?: string,
  ): WorkflowTransitionResult {
    if (!this.canTransition(fromStatus, toStatus)) {
      throw ErrorWithCode.Factory.BadRequest(
        `Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${VALID_TRANSITIONS[fromStatus]?.join(", ")}`,
      );
    }

    const entry: WorkflowHistoryEntry = {
      entityType,
      entityId,
      fromStatus,
      toStatus,
      userId,
      userName,
      note,
      timestamp: new Date(),
    };

    this.history.push(entry);

    log.info(`Workflow transition: ${fromStatus} → ${toStatus}`, {
      entityType,
      entityId,
      userId,
      note,
    });

    return {
      fromStatus,
      toStatus,
      reviewerId: userId,
      note,
      timestamp: entry.timestamp,
    };
  }
}

// Singleton
export const contentWorkflow = new ContentWorkflowService();
