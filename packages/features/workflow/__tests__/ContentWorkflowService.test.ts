import { beforeEach, describe, expect, it } from "vitest";
import { ContentWorkflowService } from "../ContentWorkflowService";

describe("ContentWorkflowService", () => {
  let workflow: ContentWorkflowService;

  beforeEach(() => {
    workflow = new ContentWorkflowService();
  });

  describe("submitForReview", () => {
    it("should transition from DRAFT to PENDING_REVIEW", () => {
      const result = workflow.submitForReview("post", 1, "DRAFT", 1, "Author");
      expect(result.fromStatus).toBe("DRAFT");
      expect(result.toStatus).toBe("PENDING_REVIEW");
    });

    it("should reject transition from PUBLISHED to PENDING_REVIEW", () => {
      expect(() => workflow.submitForReview("post", 1, "PUBLISHED", 1, "Author")).toThrow();
    });
  });

  describe("approve", () => {
    it("should transition from PENDING_REVIEW to APPROVED", () => {
      const result = workflow.approve("post", 1, "PENDING_REVIEW", 2, "Editor");
      expect(result.toStatus).toBe("APPROVED");
    });

    it("should reject transition from DRAFT to APPROVED", () => {
      expect(() => workflow.approve("post", 1, "DRAFT", 2, "Editor")).toThrow();
    });
  });

  describe("reject", () => {
    it("should transition from PENDING_REVIEW to REJECTED with note", () => {
      const result = workflow.reject("post", 1, "PENDING_REVIEW", 2, "Editor", "Needs more detail");
      expect(result.toStatus).toBe("REJECTED");
      expect(result.note).toBe("Needs more detail");
    });

    it("should require a note for rejection", () => {
      expect(() => workflow.reject("post", 1, "PENDING_REVIEW", 2, "Editor")).toThrow(
        "rejection note",
      );
    });
  });

  describe("returnToDraft", () => {
    it("should transition from REJECTED to DRAFT", () => {
      const result = workflow.returnToDraft("post", 1, "REJECTED", 1, "Author");
      expect(result.toStatus).toBe("DRAFT");
    });

    it("should transition from APPROVED to DRAFT", () => {
      const result = workflow.returnToDraft("post", 1, "APPROVED", 1, "Author");
      expect(result.toStatus).toBe("DRAFT");
    });
  });

  describe("canTransition", () => {
    it("should allow valid transitions", () => {
      expect(workflow.canTransition("DRAFT", "PENDING_REVIEW")).toBe(true);
      expect(workflow.canTransition("PENDING_REVIEW", "APPROVED")).toBe(true);
      expect(workflow.canTransition("PENDING_REVIEW", "REJECTED")).toBe(true);
      expect(workflow.canTransition("APPROVED", "PUBLISHED")).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(workflow.canTransition("DRAFT", "PUBLISHED")).toBe(false);
      expect(workflow.canTransition("DRAFT", "APPROVED")).toBe(false);
      expect(workflow.canTransition("REJECTED", "PUBLISHED")).toBe(false);
    });
  });

  describe("getAvailableTransitions", () => {
    it("should return available transitions", () => {
      expect(workflow.getAvailableTransitions("DRAFT")).toEqual(["PENDING_REVIEW"]);
      expect(workflow.getAvailableTransitions("PENDING_REVIEW")).toEqual(["APPROVED", "REJECTED"]);
    });
  });

  describe("getHistory", () => {
    it("should track transition history", () => {
      workflow.submitForReview("post", 1, "DRAFT", 1, "Author");
      workflow.approve("post", 1, "PENDING_REVIEW", 2, "Editor");

      const history = workflow.getHistory("post", 1);
      expect(history).toHaveLength(2);
      expect(history[0].toStatus).toBe("PENDING_REVIEW");
      expect(history[1].toStatus).toBe("APPROVED");
    });

    it("should isolate history per entity", () => {
      workflow.submitForReview("post", 1, "DRAFT", 1, "Author");
      workflow.submitForReview("post", 2, "DRAFT", 1, "Author");

      expect(workflow.getHistory("post", 1)).toHaveLength(1);
      expect(workflow.getHistory("post", 2)).toHaveLength(1);
    });
  });
});
