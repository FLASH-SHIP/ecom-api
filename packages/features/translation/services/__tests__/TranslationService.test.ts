import { describe, expect, it, vi } from "vitest";
import type { SlugRepository } from "@ecom/features/blog/repositories/SlugRepository";
import type { TranslationRepository } from "../../repositories/TranslationRepository";
import { TranslationService } from "../TranslationService";

function createMockRepo() {
  return {
    findActiveLanguages: vi.fn(),
    findPostTranslation: vi.fn(),
    findCategoryTranslation: vi.fn(),
    findPageTranslation: vi.fn(),
    findTagTranslation: vi.fn(),
    findPostTranslations: vi.fn(),
    findCategoryTranslations: vi.fn(),
    findPageTranslations: vi.fn(),
    findTagTranslations: vi.fn(),
    upsertPostTranslation: vi.fn(),
    upsertCategoryTranslation: vi.fn(),
    upsertPageTranslation: vi.fn(),
    upsertTagTranslation: vi.fn(),
    deletePostTranslation: vi.fn(),
    deleteCategoryTranslation: vi.fn(),
    deletePageTranslation: vi.fn(),
    deleteTagTranslation: vi.fn(),
  } as unknown as TranslationRepository & Record<string, ReturnType<typeof vi.fn>>;
}

function createMockSlugRepo() {
  return {
    findByReference: vi.fn(),
    upsertTranslation: vi.fn(),
    deleteTranslation: vi.fn(),
  } as unknown as SlugRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("TranslationService", () => {
  describe("getLanguages", () => {
    it("should return active languages", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.findActiveLanguages.mockResolvedValue([
        { code: "en", name: "English" },
        { code: "vi", name: "Vietnamese" },
      ]);

      const result = await service.getLanguages();
      expect(result).toHaveLength(2);
    });
  });

  describe("getTranslation", () => {
    it("should get post translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.findPostTranslation.mockResolvedValue({ title: "Hello", langCode: "en" });

      const result = await service.getTranslation("post", 1, "en");
      expect(result).toEqual({ title: "Hello", langCode: "en" });
    });

    it("should get category translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.findCategoryTranslation.mockResolvedValue({ name: "Tech" });

      const result = await service.getTranslation("category", 1, "en");
      expect(result).toEqual({ name: "Tech" });
    });

    it("should get page translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.findPageTranslation.mockResolvedValue({ title: "About" });

      const result = await service.getTranslation("page", 1, "en");
      expect(result).toEqual({ title: "About" });
    });

    it("should get tag translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.findTagTranslation.mockResolvedValue({ name: "JavaScript" });

      const result = await service.getTranslation("tag", 1, "en");
      expect(result).toEqual({ name: "JavaScript" });
    });
  });

  describe("saveTranslation", () => {
    it("should save post translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.upsertPostTranslation.mockResolvedValue({ id: 1 });

      await service.saveTranslation("post", 1, "vi", {
        title: "Xin chào",
        content: "Nội dung",
      });

      expect(repo.upsertPostTranslation).toHaveBeenCalledWith(1, "vi", {
        title: "Xin chào",
        slug: undefined,
        excerpt: undefined,
        content: "Nội dung",
      });
    });

    it("should save category translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.upsertCategoryTranslation.mockResolvedValue({ id: 1 });

      await service.saveTranslation("category", 1, "vi", { name: "Công nghệ" });

      expect(repo.upsertCategoryTranslation).toHaveBeenCalledWith(1, "vi", {
        name: "Công nghệ",
        description: undefined,
      });
    });

    it("should save tag translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.upsertTagTranslation.mockResolvedValue({ id: 1 });

      await service.saveTranslation("tag", 1, "vi", { name: "JS" });

      expect(repo.upsertTagTranslation).toHaveBeenCalledWith(1, "vi", { name: "JS" });
    });
  });

  describe("deleteTranslation", () => {
    it("should delete post translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.deletePostTranslation.mockResolvedValue({ id: 1 });
      slugRepo.findByReference.mockResolvedValue({ id: 123 });

      await service.deleteTranslation("post", 1, "vi");
      expect(repo.deletePostTranslation).toHaveBeenCalledWith(1, "vi");
      expect(slugRepo.deleteTranslation).toHaveBeenCalledWith(123, "vi");
    });

    it("should delete page translation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      repo.deletePageTranslation.mockResolvedValue({ id: 1 });
      slugRepo.findByReference.mockResolvedValue({ id: 456 });

      await service.deleteTranslation("page", 1, "vi");
      expect(repo.deletePageTranslation).toHaveBeenCalledWith(1, "vi");
      expect(slugRepo.deleteTranslation).toHaveBeenCalledWith(456, "vi");
    });
  });

  describe("unsupported entity type", () => {
    it("should throw BadRequest for unsupported entity in getTranslation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      await expect(service.getTranslation("unknown" as never, 1, "en")).rejects.toThrow(
        "Unsupported entity type",
      );
    });

    it("should throw BadRequest for unsupported entity in saveTranslation", async () => {
      const repo = createMockRepo();
      const slugRepo = createMockSlugRepo();
      const service = new TranslationService({ translationRepo: repo, slugRepo });

      await expect(service.saveTranslation("unknown" as never, 1, "en", {})).rejects.toThrow(
        "Unsupported entity type",
      );
    });
  });
});
