import { describe, expect, it, vi } from "vitest";
import type { ContactRepository } from "../../repositories/ContactRepository";
import { ContactService } from "../ContactService";

function createMockRepo() {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    assignTo: vi.fn(),
    markReplied: vi.fn(),
    remove: vi.fn(),
    countByStatus: vi.fn(),
  } as unknown as ContactRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("ContactService", () => {
  describe("createSubmission", () => {
    it("should create a contact submission", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date(),
      });

      const result = await service.createSubmission({
        name: "John Doe",
        email: "john@example.com",
        message: "Hello, I need help.",
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe("John Doe");
    });

    it("should support custom form slugs", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.create.mockResolvedValue({ id: 1 });

      await service.createSubmission({
        formSlug: "support",
        name: "Jane",
        email: "jane@example.com",
        message: "Support request",
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ formSlug: "support" }));
    });
  });

  describe("getSubmission", () => {
    it("should auto-mark new submissions as read", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "new", name: "Test" });
      repo.updateStatus.mockResolvedValue({ id: 1, status: "read" });

      await service.getSubmission(1);
      expect(repo.updateStatus).toHaveBeenCalledWith(1, "read");
    });

    it("should not mark already-read submissions", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "read", name: "Test" });

      await service.getSubmission(1);
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it("should throw NotFound for non-existent submission", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.getSubmission(999)).rejects.toThrow("Contact submission not found");
    });
  });

  describe("updateStatus", () => {
    it("should update submission status", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "read" });
      repo.updateStatus.mockResolvedValue({ id: 1, status: "archived" });

      const result = await service.updateStatus(1, "archived");
      expect(result.status).toBe("archived");
    });
  });

  describe("assignTo", () => {
    it("should assign submission to a user", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, assigneeId: null });
      repo.assignTo.mockResolvedValue({ id: 1, assigneeId: 5 });

      const result = await service.assignTo(1, 5);
      expect(result.assigneeId).toBe(5);
    });

    it("should throw NotFound for non-existent submission", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.assignTo(999, 5)).rejects.toThrow("Contact submission not found");
    });
  });

  describe("markReplied", () => {
    it("should mark submission as replied", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, status: "read" });
      repo.markReplied.mockResolvedValue({
        id: 1,
        status: "replied",
        repliedAt: new Date(),
      });

      const result = await service.markReplied(1);
      expect(result.status).toBe("replied");
      expect(result.repliedAt).toBeDefined();
    });
  });

  describe("deleteSubmission", () => {
    it("should delete a submission", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue({ id: 1 });
      repo.remove.mockResolvedValue({ id: 1 });

      await service.deleteSubmission(1);
      expect(repo.remove).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when deleting non-existent submission", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.deleteSubmission(999)).rejects.toThrow("Contact submission not found");
    });
  });

  describe("getStatusCounts", () => {
    it("should return counts by status", async () => {
      const repo = createMockRepo();
      const service = new ContactService({ contactRepo: repo });

      repo.countByStatus.mockResolvedValue({ new: 3, read: 5, replied: 10, archived: 2 });

      const result = await service.getStatusCounts();
      expect(result).toEqual({ new: 3, read: 5, replied: 10, archived: 2 });
    });
  });
});
