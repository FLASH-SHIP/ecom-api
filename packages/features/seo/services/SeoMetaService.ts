import type { SeoMetaRepository } from "@ecom/features/seo/repositories/SeoMetaRepository";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("SeoMetaService");

export interface ISeoMetaServiceDeps {
  seoMetaRepo: SeoMetaRepository;
}

interface SeoData {
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  indexMode?: string;
}

export class SeoMetaService {
  private deps: ISeoMetaServiceDeps;
  constructor(deps: ISeoMetaServiceDeps) {
    this.deps = deps;
  }

  async getForPost(postId: number) {
    return this.deps.seoMetaRepo.findByPostId(postId);
  }

  async getForCategory(categoryId: number) {
    return this.deps.seoMetaRepo.findByCategoryId(categoryId);
  }

  async getForPage(pageId: number) {
    return this.deps.seoMetaRepo.findByPageId(pageId);
  }

  async getForTag(tagId: number) {
    return this.deps.seoMetaRepo.findByTagId(tagId);
  }

  async saveForPost(postId: number, data: SeoData) {
    if (!data.seoTitle && !data.seoDescription && !data.seoImage && !data.indexMode) {
      return null;
    }

    log.info("Saving SEO meta for post", { postId });
    return this.deps.seoMetaRepo.upsertForPost(postId, data);
  }

  async saveForCategory(categoryId: number, data: SeoData) {
    if (!data.seoTitle && !data.seoDescription && !data.seoImage && !data.indexMode) {
      return null;
    }

    log.info("Saving SEO meta for category", { categoryId });
    return this.deps.seoMetaRepo.upsertForCategory(categoryId, data);
  }

  async saveForPage(pageId: number, data: SeoData) {
    if (!data.seoTitle && !data.seoDescription && !data.seoImage && !data.indexMode) {
      return null;
    }

    log.info("Saving SEO meta for page", { pageId });
    return this.deps.seoMetaRepo.upsertForPage(pageId, data);
  }

  async saveForTag(tagId: number, data: SeoData) {
    if (!data.seoTitle && !data.seoDescription && !data.seoImage && !data.indexMode) {
      return null;
    }

    log.info("Saving SEO meta for tag", { tagId });
    return this.deps.seoMetaRepo.upsertForTag(tagId, data);
  }
}
