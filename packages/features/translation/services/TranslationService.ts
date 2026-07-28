import type { SlugRepository } from "@ecom/features/blog/repositories/SlugRepository";
import type { TranslationRepository } from "@ecom/features/translation/repositories/TranslationRepository";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("TranslationService");

export interface ITranslationServiceDeps {
  translationRepo: TranslationRepository;
  slugRepo: SlugRepository;
}

type EntityType = "post" | "category" | "page" | "tag" | "menuItem";

export class TranslationService {
  private deps: ITranslationServiceDeps;
  constructor(deps: ITranslationServiceDeps) {
    this.deps = deps;
  }

  async getLanguages() {
    return this.deps.translationRepo.findActiveLanguages();
  }

  async getTranslation(entityType: EntityType, entityId: number, langCode: string) {
    switch (entityType) {
      case "post":
        return this.deps.translationRepo.findPostTranslation(entityId, langCode);
      case "category":
        return this.deps.translationRepo.findCategoryTranslation(entityId, langCode);
      case "page":
        return this.deps.translationRepo.findPageTranslation(entityId, langCode);
      case "tag":
        return this.deps.translationRepo.findTagTranslation(entityId, langCode);
      case "menuItem":
        return this.deps.translationRepo.findMenuItemTranslation(entityId, langCode);
      default:
        throw ErrorWithCode.Factory.BadRequest(`Unsupported entity type: ${entityType}`);
    }
  }

  async listTranslations(entityType: EntityType, entityId: number) {
    switch (entityType) {
      case "post":
        return this.deps.translationRepo.findPostTranslations(entityId);
      case "category":
        return this.deps.translationRepo.findCategoryTranslations(entityId);
      case "page":
        return this.deps.translationRepo.findPageTranslations(entityId);
      case "tag":
        return this.deps.translationRepo.findTagTranslations(entityId);
      case "menuItem":
        return this.deps.translationRepo.findMenuItemTranslations(entityId);
      default:
        throw ErrorWithCode.Factory.BadRequest(`Unsupported entity type: ${entityType}`);
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: switch-case routes to entity-specific upsert operations
  async saveTranslation(
    entityType: EntityType,
    entityId: number,
    langCode: string,
    data: Record<string, string | undefined>,
  ) {
    log.info("Saving translation", { entityType, entityId, langCode });

    switch (entityType) {
      case "post": {
        const result = await this.deps.translationRepo.upsertPostTranslation(entityId, langCode, {
          title: data.title ?? "",
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
        });
        if (data.slug) {
          const mainSlug = await this.deps.slugRepo.findByReference(entityId, "Post");
          if (mainSlug) {
            await this.deps.slugRepo.upsertTranslation(mainSlug.id, langCode, data.slug);
          }
        }
        return result;
      }
      case "category":
        return this.deps.translationRepo.upsertCategoryTranslation(entityId, langCode, {
          name: data.name ?? "",
          description: data.description,
        });
      case "page": {
        const result = await this.deps.translationRepo.upsertPageTranslation(entityId, langCode, {
          title: data.title ?? "",
          slug: data.slug,
          content: data.content,
          excerpt: data.excerpt,
          subtitle: data.subtitle,
          ctaText: data.ctaText,
          ctaLink: data.ctaLink,
        });
        if (data.slug) {
          const mainSlug = await this.deps.slugRepo.findByReference(entityId, "Page");
          if (mainSlug) {
            await this.deps.slugRepo.upsertTranslation(mainSlug.id, langCode, data.slug);
          }
        }
        return result;
      }
      case "tag":
        return this.deps.translationRepo.upsertTagTranslation(entityId, langCode, {
          name: data.name ?? "",
          description: data.description,
        });
      case "menuItem":
        return this.deps.translationRepo.upsertMenuItemTranslation(entityId, langCode, {
          label: data.label ?? "",
        });
      default:
        throw ErrorWithCode.Factory.BadRequest(`Unsupported entity type: ${entityType}`);
    }
  }

  async deleteTranslation(entityType: EntityType, entityId: number, langCode: string) {
    log.info("Deleting translation", { entityType, entityId, langCode });

    switch (entityType) {
      case "post": {
        const mainSlug = await this.deps.slugRepo.findByReference(entityId, "Post");
        if (mainSlug) {
          await this.deps.slugRepo.deleteTranslation(mainSlug.id, langCode);
        }
        return this.deps.translationRepo.deletePostTranslation(entityId, langCode);
      }
      case "category":
        return this.deps.translationRepo.deleteCategoryTranslation(entityId, langCode);
      case "page": {
        const mainSlug = await this.deps.slugRepo.findByReference(entityId, "Page");
        if (mainSlug) {
          await this.deps.slugRepo.deleteTranslation(mainSlug.id, langCode);
        }
        return this.deps.translationRepo.deletePageTranslation(entityId, langCode);
      }
      case "tag":
        return this.deps.translationRepo.deleteTagTranslation(entityId, langCode);
      case "menuItem":
        return this.deps.translationRepo.deleteMenuItemTranslation(entityId, langCode);
      default:
        throw ErrorWithCode.Factory.BadRequest(`Unsupported entity type: ${entityType}`);
    }
  }

  async getTranslationStatus(entityType: EntityType, entityId: number) {
    return this.deps.translationRepo.getTranslationStatus(entityType, entityId);
  }

  async getBatchTranslationStatus(entityType: EntityType, entityIds: number[]) {
    return this.deps.translationRepo.getBatchTranslationStatus(entityType, entityIds);
  }
}
