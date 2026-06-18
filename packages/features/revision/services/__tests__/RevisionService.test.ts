import { describe, expect, it, vi } from "vitest";
import type { RevisionRepository } from "../../repositories/RevisionRepository";
import { RevisionService } from "../RevisionService";

function createMockRevisionRepo() {
  return {
    create: vi.fn(),
    findByReference: vi.fn(),
    findById: vi.fn(),
    deleteOldRevisions: vi.fn(),
  } as unknown as RevisionRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("RevisionService", () => {
  describe("createRevision", () => {
    it("should create a revision and trigger pruning", async () => {
      const revisionRepo = createMockRevisionRepo();
      const service = new RevisionService({ revisionRepo });

      const mockRevision = { id: 1, title: "Draft v1", referenceId: 10, referenceType: "post" };
      revisionRepo.create.mockResolvedValue(mockRevision);
      revisionRepo.deleteOldRevisions.mockResolvedValue(0);

      const result = await service.createRevision({
        referenceId: 10,
        referenceType: "post",
        title: "Draft v1",
        content: "content",
        authorId: 1,
      });

      expect(result).toEqual(mockRevision);
      expect(revisionRepo.create).toHaveBeenCalled();
    });
  });

  describe("getRevision", () => {
    it("should return revision when found", async () => {
      const revisionRepo = createMockRevisionRepo();
      const service = new RevisionService({ revisionRepo });

      revisionRepo.findById.mockResolvedValue({ id: 1, title: "v1" });

      const result = await service.getRevision(1);
      expect(result).toEqual({ id: 1, title: "v1" });
    });

    it("should throw NotFound when revision does not exist", async () => {
      const revisionRepo = createMockRevisionRepo();
      const service = new RevisionService({ revisionRepo });

      revisionRepo.findById.mockResolvedValue(null);

      await expect(service.getRevision(999)).rejects.toThrow("Revision not found");
    });
  });

  describe("listRevisions", () => {
    it("should return revisions for a given reference", async () => {
      const revisionRepo = createMockRevisionRepo();
      const service = new RevisionService({ revisionRepo });

      const mockRevisions = [
        { id: 2, title: "v2" },
        { id: 1, title: "v1" },
      ];
      revisionRepo.findByReference.mockResolvedValue(mockRevisions);

      const result = await service.listRevisions(10, "post");
      expect(result).toHaveLength(2);
      expect(revisionRepo.findByReference).toHaveBeenCalledWith(10, "post");
    });
  });
});
