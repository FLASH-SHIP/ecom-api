import { describe, expect, it, vi } from "vitest";
import type { TagRepository } from "../../repositories/TagRepository";
import type { SlugService } from "../SlugService";
import { TagService } from "../TagService";

function createMockTagRepo() {
  return {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    findBySlug: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    hardDelete: vi.fn(),
    findOrCreateByNames: vi.fn(),
  } as unknown as TagRepository & Record<string, ReturnType<typeof vi.fn>>;
}

function createMockSlugService() {
  return {
    createSlug: vi.fn(),
    updateSlug: vi.fn(),
    deleteSlug: vi.fn(),
  } as unknown as SlugService & Record<string, ReturnType<typeof vi.fn>>;
}

describe("TagService", () => {
  describe("getTag", () => {
    it("should return tag when found", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findByIdWithRelations.mockResolvedValue({ id: 1, name: "TypeScript" });

      const result = await service.getTag(1);
      expect(result).toEqual({ id: 1, name: "TypeScript" });
    });

    it("should throw NotFound when tag does not exist", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.getTag(999)).rejects.toThrow("Tag not found");
    });
  });

  describe("createTag", () => {
    it("should create tag with auto-generated slug", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      slugService.createSlug.mockResolvedValue({ key: "typescript" });
      tagRepo.create.mockResolvedValue({ id: 1, name: "TypeScript", slug: "typescript" });
      slugService.updateSlug.mockResolvedValue({ key: "typescript" });

      const result = await service.createTag({ name: "TypeScript" });
      expect(result).toEqual({ id: 1, name: "TypeScript", slug: "typescript" });
    });
  });

  describe("deleteTag", () => {
    it("should soft delete tag and NOT delete its slug", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue({ id: 1, name: "TypeScript" });
      tagRepo.softDelete.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await service.deleteTag(1);
      expect(slugService.deleteSlug).not.toHaveBeenCalled();
      expect(tagRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when tag does not exist", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue(null);

      await expect(service.deleteTag(999)).rejects.toThrow("Tag not found");
    });
  });

  describe("restoreTag", () => {
    it("should restore tag", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue({ id: 1, name: "TypeScript" });
      tagRepo.restore.mockResolvedValue({ id: 1, deletedAt: null });

      await service.restoreTag(1);
      expect(tagRepo.restore).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when tag does not exist", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue(null);

      await expect(service.restoreTag(999)).rejects.toThrow("Tag not found");
    });
  });

  describe("permanentlyDeleteTag", () => {
    it("should permanently delete tag and its slug", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue({ id: 1, name: "TypeScript" });
      tagRepo.hardDelete.mockResolvedValue({ id: 1 });
      slugService.deleteSlug.mockResolvedValue(undefined);

      await service.permanentlyDeleteTag(1);
      expect(slugService.deleteSlug).toHaveBeenCalledWith(1, "Tag");
      expect(tagRepo.hardDelete).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when tag does not exist", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue(null);

      await expect(service.permanentlyDeleteTag(999)).rejects.toThrow("Tag not found");
    });
  });

  describe("updateTag", () => {
    it("should throw NotFound when tag does not exist", async () => {
      const tagRepo = createMockTagRepo();
      const slugService = createMockSlugService();
      const service = new TagService({ tagRepo, slugService });

      tagRepo.findById.mockResolvedValue(null);

      await expect(service.updateTag(999, { name: "New" })).rejects.toThrow("Tag not found");
    });
  });
});
