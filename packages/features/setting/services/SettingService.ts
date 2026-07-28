import type { SettingRepository } from "@ecom/features/setting/repositories/SettingRepository";
import { settingsCache } from "@flash-ship/ecom-lib/cache";

export interface ISettingServiceDeps {
  settingRepo: SettingRepository;
}

export class SettingService {
  private deps: ISettingServiceDeps;
  constructor(deps: ISettingServiceDeps) {
    this.deps = deps;
  }

  /** Get a single setting value by key */
  async get(key: string): Promise<string | null> {
    const setting = await this.deps.settingRepo.findByKey(key);
    return setting?.value ?? null;
  }

  /** Get multiple settings as a key-value map */
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const settings = await this.deps.settingRepo.findByKeys(keys);
    const map: Record<string, string | null> = {};

    // Initialize all requested keys with null
    for (const key of keys) {
      map[key] = null;
    }

    // Fill in found values
    for (const setting of settings) {
      map[setting.key] = setting.value;
    }

    return map;
  }

  /** Get all settings as a key-value map (cached for 120s) */
  async getAll(): Promise<Record<string, string | null>> {
    const cached = settingsCache.get("all") as Record<string, string | null> | undefined;
    if (cached) return cached;
    const settings = await this.deps.settingRepo.findAll();
    const map: Record<string, string | null> = {};
    for (const setting of settings) {
      map[setting.key] = setting.value;
    }
    settingsCache.set("all", map);
    return map;
  }

  /** Set a single setting */
  async set(key: string, value: string | null) {
    const result = await this.deps.settingRepo.set(key, value);
    settingsCache.invalidate("all");
    return result;
  }

  /** Set multiple settings at once */
  async bulkSet(items: Array<{ key: string; value: string | null }>) {
    const result = await this.deps.settingRepo.bulkSet(items);
    settingsCache.invalidate("all");
    return result;
  }

  /** Delete a setting */
  async delete(key: string) {
    const result = await this.deps.settingRepo.delete(key);
    settingsCache.invalidate("all");
    return result;
  }

  // ─── Typed convenience getters ────────────────────

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    return value === "true" || value === "1";
  }

  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  async getJson<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
}
