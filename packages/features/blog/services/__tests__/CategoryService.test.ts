import { describe, expect, it, vi } from "vitest";
import type { CategoryRepository } from "../../repositories/CategoryRepository";
import { CategoryService } from "../CategoryService";
import type { SlugService } from "../SlugService";

function createMockCategoryRepo() {
  return {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    findBySlug: vi.fn(),
    findMany: vi.fn(),
    findTree: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    hardDelete: vi.fn(),
  } as unknown as CategoryRepository & Record<string, ReturnType<typeof vi.fn>>;
}

function createMockSlugService() {
  return {
    createSlug: vi.fn(),
    updateSlug: vi.fn(),
    deleteSlug: vi.fn(),
  } as unknown as SlugService & Record<string, ReturnType<typeof vi.fn>>;
}

describe("CategoryService", () => {
  describe("getCategory", () => {
    it("should return category when found", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      const mockCategory = { id: 1, name: "Tech", slug: "tech" };
      categoryRepo.findByIdWithRelations.mockResolvedValue(mockCategory);

      const result = await service.getCategory(1);
      expect(result).toEqual(mockCategory);
      expect(categoryRepo.findByIdWithRelations).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when category does not exist", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      categoryRepo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.getCategory(999)).rejects.toThrow("Category not found");
    });
  });

  describe("createCategory", () => {
    it("should create category with auto-generated slug", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      slugService.createSlug.mockResolvedValue({ key: "tech" });
      categoryRepo.create.mockResolvedValue({ id: 1, name: "Tech", slug: "tech" });

      const result = await service.createCategory({ name: "Tech" });

      expect(result).toEqual({ id: 1, name: "Tech", slug: "tech" });
      expect(slugService.createSlug).toHaveBeenCalledWith(0, "Category", "Tech", undefined);
    });

    it("should use custom slug when provided", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      slugService.createSlug.mockResolvedValue({ key: "custom-slug" });
      categoryRepo.create.mockResolvedValue({ id: 1, name: "Tech", slug: "custom-slug" });

      await service.createCategory({ name: "Tech", slug: "custom-slug" });

      expect(slugService.createSlug).toHaveBeenCalledWith(0, "Category", "Tech", "custom-slug");
    });
  });

  describe("deleteCategory", () => {
    it("should soft-delete a non-default category", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      categoryRepo.findById.mockResolvedValue({ id: 1, name: "Tech", isDefault: 0 });
      categoryRepo.softDelete.mockResolvedValue({ id: 1, deletedAt: new Date() });

      await service.deleteCategory(1);

      expect(categoryRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it("should throw when trying to delete the default category", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      categoryRepo.findById.mockResolvedValue({ id: 1, name: "General", isDefault: 1 });

      await expect(service.deleteCategory(1)).rejects.toThrow("Cannot delete the default category");
    });

    it("should throw NotFound when category does not exist", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      categoryRepo.findById.mockResolvedValue(null);

      await expect(service.deleteCategory(999)).rejects.toThrow("Category not found");
    });
  });

  describe("updateCategory", () => {
    it("should prevent circular parent reference", async () => {
      const categoryRepo = createMockCategoryRepo();
      const slugService = createMockSlugService();
      const service = new CategoryService({ categoryRepo, slugService });

      categoryRepo.findById.mockResolvedValue({ id: 1, name: "Tech" });

      await expect(service.updateCategory(1, { parentId: 1 })).rejects.toThrow(
        "Category cannot be its own parent",
      );
    });
  });
});
