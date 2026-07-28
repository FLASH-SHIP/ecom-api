import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("LanguageLocaleCache");

/**
 * In-memory language locale cache — mirrors Botble's `LanguageLocaleCache` pattern.
 *
 * Caches active languages and default language to avoid repeated DB queries.
 * Invalidated automatically when language CRUD operations occur.
 *
 * This is a singleton cache living in the Node.js process. For multi-process
 * deployments, set a TTL to ensure eventual consistency.
 */

export interface CachedLanguage {
  id: number;
  name: string;
  locale: string;
  code: string;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  isRtl: boolean;
  order: number;
}

type LanguageFetcher = {
  findActive: () => Promise<CachedLanguage[]>;
  findDefault: () => Promise<CachedLanguage | null>;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

class LanguageLocaleCacheImpl {
  private activeLanguages: CachedLanguage[] | null = null;
  private defaultLanguage: CachedLanguage | null | undefined = undefined;
  private localeToCodeMap: Map<string, string> = new Map();
  private codeToLocaleMap: Map<string, string> = new Map();
  private lastFetchTime = 0;
  private ttlMs: number;
  private fetcher: LanguageFetcher | null = null;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /** Inject the data fetcher (called once during DI setup) */
  setFetcher(fetcher: LanguageFetcher) {
    this.fetcher = fetcher;
  }

  private isStale(): boolean {
    return Date.now() - this.lastFetchTime > this.ttlMs;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.activeLanguages !== null && !this.isStale()) return;
    await this.reload();
  }

  /** Force reload from DB — called on CRUD operations */
  async reload(): Promise<void> {
    if (!this.fetcher) {
      log.warn("LanguageLocaleCache: no fetcher set, skipping reload");
      return;
    }

    try {
      const [active, defaultLang] = await Promise.all([
        this.fetcher.findActive(),
        this.fetcher.findDefault(),
      ]);

      this.activeLanguages = active;
      this.defaultLanguage = defaultLang;
      this.lastFetchTime = Date.now();

      this.localeToCodeMap.clear();
      this.codeToLocaleMap.clear();
      for (const lang of active) {
        this.localeToCodeMap.set(lang.locale, lang.code);
        this.codeToLocaleMap.set(lang.code, lang.locale);
      }

      log.info("Cache reloaded", {
        activeCount: active.length,
        defaultLocale: defaultLang?.locale ?? "none",
      });
    } catch (err) {
      log.error("Failed to reload language cache", { error: String(err) });
      throw err;
    }
  }

  /** Invalidate all cached data — called after create/update/delete */
  invalidate(): void {
    this.activeLanguages = null;
    this.defaultLanguage = undefined;
    this.localeToCodeMap.clear();
    this.codeToLocaleMap.clear();
    this.lastFetchTime = 0;
    log.info("Cache invalidated");
  }

  /** Get all active languages (cached) */
  async getActiveLanguages(): Promise<CachedLanguage[]> {
    await this.ensureLoaded();
    return this.activeLanguages ?? [];
  }

  /** Get the default language (cached) */
  async getDefaultLanguage(): Promise<CachedLanguage | null> {
    await this.ensureLoaded();
    return this.defaultLanguage ?? null;
  }

  /** Get default locale code (e.g., "vi") */
  async getDefaultLocaleCode(): Promise<string> {
    const lang = await this.getDefaultLanguage();
    return lang?.locale ?? "vi";
  }

  /**
   * Normalize a locale to its full language code.
   * e.g., "en" → "en_US", "vi" → "vi"
   */
  async normalizeLanguageCode(locale: string): Promise<string | null> {
    await this.ensureLoaded();
    return this.localeToCodeMap.get(locale) ?? null;
  }

  /**
   * Resolve a full language code to its short locale.
   * e.g., "en_US" → "en", "vi" → "vi"
   */
  async resolveToLocale(code: string): Promise<string | null> {
    await this.ensureLoaded();
    return this.codeToLocaleMap.get(code) ?? null;
  }

  /** Check if a locale is supported and active */
  async isActiveLocale(locale: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.localeToCodeMap.has(locale);
  }
}

/** Singleton instance */
export const LanguageLocaleCache = new LanguageLocaleCacheImpl();
