import { describe, expect, it, vi } from "vitest";
import type { SeoMetaRepository } from "../../repositories/SeoMetaRepository";
import { SeoMetaService } from "../SeoMetaService";

function createMockRepo() {
  return {
    findByPostId: vi.fn(),
    findByCategoryId: vi.fn(),
    findByPageId: vi.fn(),
    upsertForPost: vi.fn(),
    upsertForCategory: vi.fn(),
    upsertForPage: vi.fn(),
  } as unknown as SeoMetaRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("SeoMetaService", () => {
  describe("getForPost", () => {
    it("should return SEO meta for a post", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      repo.findByPostId.mockResolvedValue({ seoTitle: "My Title", seoDescription: "Desc" });

      const result = await service.getForPost(1);
      expect(result).toEqual({ seoTitle: "My Title", seoDescription: "Desc" });
    });

    it("should return null when no SEO meta exists", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      repo.findByPostId.mockResolvedValue(null);

      const result = await service.getForPost(1);
      expect(result).toBeNull();
    });
  });

  describe("saveForPost", () => {
    it("should save SEO data when at least one field is provided", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      repo.upsertForPost.mockResolvedValue({ id: 1 });

      const result = await service.saveForPost(1, { seoTitle: "New Title" });
      expect(result).toEqual({ id: 1 });
      expect(repo.upsertForPost).toHaveBeenCalledWith(1, { seoTitle: "New Title" });
    });

    it("should return null when no SEO fields are provided", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      const result = await service.saveForPost(1, {});
      expect(result).toBeNull();
      expect(repo.upsertForPost).not.toHaveBeenCalled();
    });
  });

  describe("saveForCategory", () => {
    it("should save SEO for category", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      repo.upsertForCategory.mockResolvedValue({ id: 1 });

      await service.saveForCategory(5, { seoDescription: "Category desc" });
      expect(repo.upsertForCategory).toHaveBeenCalledWith(5, {
        seoDescription: "Category desc",
      });
    });

    it("should skip when no data provided", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      const result = await service.saveForCategory(5, {});
      expect(result).toBeNull();
    });
  });

  describe("saveForPage", () => {
    it("should save SEO for page", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      repo.upsertForPage.mockResolvedValue({ id: 1 });

      await service.saveForPage(3, { indexMode: "noindex" });
      expect(repo.upsertForPage).toHaveBeenCalledWith(3, { indexMode: "noindex" });
    });
  });

  describe("getForCategory", () => {
    it("should return SEO meta for category", async () => {
      const repo = createMockRepo();
      const service = new SeoMetaService({ seoMetaRepo: repo });

      repo.findByCategoryId.mockResolvedValue({ seoTitle: "Cat Title" });

      const result = await service.getForCategory(1);
      expect(result).toEqual({ seoTitle: "Cat Title" });
    });
  });
});
