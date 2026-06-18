import { describe, expect, it } from "vitest";
import { WorkflowService } from "../WorkflowService";

describe("WorkflowService", () => {
  const service = new WorkflowService();

  it("should allow DRAFT → PENDING", () => {
    expect(service.canTransition("DRAFT", "PENDING")).toBe(true);
  });

  it("should allow DRAFT → PUBLISHED (direct publish)", () => {
    expect(service.canTransition("DRAFT", "PUBLISHED")).toBe(true);
  });

  it("should allow PENDING → REVIEW", () => {
    expect(service.canTransition("PENDING", "REVIEW")).toBe(true);
  });

  it("should allow REVIEW → PUBLISHED (approve)", () => {
    expect(service.canTransition("REVIEW", "PUBLISHED")).toBe(true);
  });

  it("should allow REVIEW → REJECTED", () => {
    expect(service.canTransition("REVIEW", "REJECTED")).toBe(true);
  });

  it("should allow REJECTED → DRAFT (revise)", () => {
    expect(service.canTransition("REJECTED", "DRAFT")).toBe(true);
  });

  it("should NOT allow PENDING → PUBLISHED (skip review)", () => {
    expect(service.canTransition("PENDING", "PUBLISHED")).toBe(false);
  });

  it("should NOT allow REJECTED → PUBLISHED (skip revision)", () => {
    expect(service.canTransition("REJECTED", "PUBLISHED")).toBe(false);
  });

  it("should allow any status → ARCHIVED", () => {
    const statuses = ["DRAFT", "PENDING", "REVIEW", "PUBLISHED"] as const;
    for (const s of statuses) {
      expect(service.canTransition(s, "ARCHIVED")).toBe(true);
    }
  });

  it("should throw on invalid transition via validateTransition", () => {
    expect(() => service.validateTransition("PENDING", "PUBLISHED")).toThrow(
      /Invalid status transition/,
    );
  });

  it("should return available transitions", () => {
    const transitions = service.getAvailableTransitions("REVIEW");
    expect(transitions).toContain("PUBLISHED");
    expect(transitions).toContain("REJECTED");
  });
});
