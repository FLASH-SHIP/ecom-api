import { slugify } from "@flash-ship/ecom-lib/slugify";
import type { SlugRepository } from "../repositories/SlugRepository";

interface ISlugServiceDeps {
  slugRepo: SlugRepository;
}

const SLUG_PREFIXES: Record<string, string> = {
  Post: "",
  Category: "",
  Tag: "tag",
  Page: "",
};

export class SlugService {
  private deps: ISlugServiceDeps;
  constructor(deps: ISlugServiceDeps) {
    this.deps = deps;
  }

  /**
   * Generate a unique, URL-safe slug for a model.
   * Checks the centralized Slug table for cross-model collision detection.
   */
  async createSlug(referenceId: number, referenceType: string, name: string, customSlug?: string) {
    const prefix = SLUG_PREFIXES[referenceType] ?? "";
    const baseSlug = customSlug?.trim() ? slugify(customSlug) : slugify(name);

    const uniqueKey = await this.ensureUnique(baseSlug, prefix);

    return this.deps.slugRepo.upsert({
      referenceId,
      referenceType,
      key: uniqueKey,
      prefix,
    });
  }

  /**
   * Update slug for an existing model.
   * Only updates if the slug actually changed.
   */
  async updateSlug(referenceId: number, referenceType: string, name: string, customSlug?: string) {
    const existing = await this.deps.slugRepo.findByReference(referenceId, referenceType);
    const prefix = SLUG_PREFIXES[referenceType] ?? "";

    const baseSlug = customSlug?.trim() ? slugify(customSlug) : slugify(name);

    if (existing && existing.key === baseSlug) {
      return existing;
    }

    const uniqueKey = await this.ensureUnique(baseSlug, prefix, existing?.id);

    return this.deps.slugRepo.upsert({
      referenceId,
      referenceType,
      key: uniqueKey,
      prefix,
    });
  }

  /**
   * Delete slug when the referenced model is permanently deleted.
   */
  async deleteSlug(referenceId: number, referenceType: string) {
    return this.deps.slugRepo.deleteByReference(referenceId, referenceType);
  }

  /**
   * Ensure a slug is unique within the same prefix by appending a numeric suffix.
   * Mirrors old CMS SlugService collision detection.
   */
  private async ensureUnique(
    baseSlug: string,
    prefix: string,
    excludeId?: number,
  ): Promise<string> {
    let slug = baseSlug;

    if (!slug) {
      slug = String(Date.now());
    }

    let index = 1;
    while (await this.deps.slugRepo.exists(slug, prefix, excludeId)) {
      slug = `${baseSlug}-${index}`;
      index++;
    }

    return slug;
  }
}
