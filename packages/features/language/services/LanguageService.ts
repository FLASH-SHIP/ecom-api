import type { LanguageMetaRepository } from "@ecom/features/language/repositories/LanguageMetaRepository";
import type { LanguageRepository } from "@ecom/features/language/repositories/LanguageRepository";
import { LanguageLocaleCache } from "@ecom/features/language/services/LanguageLocaleCache";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("LanguageService");

export interface ILanguageServiceDeps {
  languageRepo: LanguageRepository;
  languageMetaRepo: LanguageMetaRepository;
}

export class LanguageService {
  private deps: ILanguageServiceDeps;
  private cacheInitialized = false;

  constructor(deps: ILanguageServiceDeps) {
    this.deps = deps;
  }

  private ensureCacheInitialized() {
    if (this.cacheInitialized) return;
    LanguageLocaleCache.setFetcher({
      findActive: () => this.deps.languageRepo.findActive(),
      findDefault: () => this.deps.languageRepo.findDefault(),
    });
    this.cacheInitialized = true;
  }

  // ─── Language CRUD ────────────────────────────────

  async getLanguages() {
    return this.deps.languageRepo.findAll();
  }

  async getActiveLanguages() {
    this.ensureCacheInitialized();
    return LanguageLocaleCache.getActiveLanguages();
  }

  async getLanguageById(id: number) {
    const lang = await this.deps.languageRepo.findById(id);
    if (!lang) throw ErrorWithCode.Factory.NotFound("Language not found");
    return lang;
  }

  async getDefaultLanguage() {
    this.ensureCacheInitialized();
    const lang = await LanguageLocaleCache.getDefaultLanguage();
    if (!lang) throw ErrorWithCode.Factory.NotFound("No default language configured");
    return lang;
  }

  async createLanguage(data: {
    name: string;
    locale: string;
    code: string;
    flag?: string;
    isRtl?: boolean;
    order?: number;
  }) {
    const existingByLocale = await this.deps.languageRepo.findByLocale(data.locale);
    if (existingByLocale) {
      throw ErrorWithCode.Factory.BadRequest(
        `Language with locale '${data.locale}' already exists`,
      );
    }

    const existingByCode = await this.deps.languageRepo.findByCode(data.code);
    if (existingByCode) {
      throw ErrorWithCode.Factory.BadRequest(`Language with code '${data.code}' already exists`);
    }

    const count = await this.deps.languageRepo.count();
    const isDefault = count === 0;

    log.info("Creating language", { name: data.name, locale: data.locale, code: data.code });

    const result = await this.deps.languageRepo.create({
      ...data,
      isDefault,
      isActive: true,
    });

    LanguageLocaleCache.invalidate();
    return result;
  }

  async updateLanguage(
    id: number,
    data: {
      name?: string;
      locale?: string;
      code?: string;
      flag?: string;
      isRtl?: boolean;
      order?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await this.deps.languageRepo.findById(id);
    if (!existing) throw ErrorWithCode.Factory.NotFound("Language not found");

    if (data.locale && data.locale !== existing.locale) {
      const dup = await this.deps.languageRepo.findByLocale(data.locale);
      if (dup) throw ErrorWithCode.Factory.BadRequest(`Locale '${data.locale}' already in use`);
    }

    if (data.code && data.code !== existing.code) {
      const dup = await this.deps.languageRepo.findByCode(data.code);
      if (dup) throw ErrorWithCode.Factory.BadRequest(`Code '${data.code}' already in use`);
    }

    if (data.isActive === false && existing.isDefault) {
      throw ErrorWithCode.Factory.BadRequest("Cannot deactivate the default language");
    }

    log.info("Updating language", { id, changes: data });

    const result = await this.deps.languageRepo.update(id, data);
    LanguageLocaleCache.invalidate();
    return result;
  }

  async deleteLanguage(id: number) {
    const lang = await this.deps.languageRepo.findById(id);
    if (!lang) throw ErrorWithCode.Factory.NotFound("Language not found");

    if (lang.isDefault) {
      throw ErrorWithCode.Factory.BadRequest("Cannot delete the default language");
    }

    const count = await this.deps.languageRepo.count();
    if (count <= 1) {
      throw ErrorWithCode.Factory.BadRequest("Cannot delete the last language");
    }

    log.info("Deleting language and associated meta", { id, code: lang.code });

    await this.deps.languageMetaRepo.deleteByLangCode(lang.code);
    const result = await this.deps.languageRepo.delete(id);
    LanguageLocaleCache.invalidate();
    return result;
  }

  async setDefaultLanguage(id: number) {
    const lang = await this.deps.languageRepo.findById(id);
    if (!lang) throw ErrorWithCode.Factory.NotFound("Language not found");

    if (!lang.isActive) {
      throw ErrorWithCode.Factory.BadRequest("Cannot set an inactive language as default");
    }

    log.info("Setting default language", { id, code: lang.code });

    const [, updated] = await this.deps.languageRepo.setDefault(id);
    LanguageLocaleCache.invalidate();
    return updated;
  }

  // ─── Language Meta Operations ─────────────────────

  async saveContentLanguage(
    referenceId: number,
    referenceType: string,
    langCode: string,
    refFrom?: number,
  ) {
    let origin: string | undefined;

    if (refFrom) {
      const sourceMeta = await this.deps.languageMetaRepo.findByReference(refFrom, referenceType);
      if (sourceMeta) {
        origin = sourceMeta.origin;
      }
    }

    return this.deps.languageMetaRepo.saveMetaData(referenceId, referenceType, langCode, origin);
  }

  async deleteContentLanguage(referenceId: number, referenceType: string) {
    return this.deps.languageMetaRepo.deleteByReference(referenceId, referenceType);
  }

  async getRelatedLanguageItems(referenceId: number, referenceType: string) {
    return this.deps.languageMetaRepo.findRelatedItems(referenceId, referenceType);
  }
}
