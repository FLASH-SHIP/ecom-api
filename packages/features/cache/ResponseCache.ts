import { createLogger } from "@ecom/lib/logger";

const log = createLogger("ResponseCache");

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory response cache for frequently accessed, rarely-changing data.
 *
 * Inspired by Laravel's Cache facade with TTL support.
 * Suitable for: settings, categories, tags, feature flags, templates.
 *
 * For production at scale, swap to Redis cache via @ecom/lib/redis.
 */
class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private hitCount = 0;
  private missCount = 0;

  /**
   * Get a cached value or compute it if missing/expired.
   *
   * @param key - Unique cache key
   * @param ttlMs - Time-to-live in milliseconds
   * @param factory - Async function to compute the value on miss
   */
  async remember<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > Date.now()) {
      this.hitCount++;
      return existing.value;
    }

    this.missCount++;
    const value = await factory();
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  /**
   * Invalidate a specific cache key or pattern.
   */
  forget(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   * Example: forgetByPrefix("categories:") clears all category caches.
   */
  forgetByPrefix(prefix: string): number {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    if (cleared > 0) {
      log.info(`Cache invalidated: ${prefix}* (${cleared} entries)`);
    }
    return cleared;
  }

  /**
   * Clear the entire cache.
   */
  flush(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    log.info(`Cache flushed: ${size} entries cleared`);
  }

  /**
   * Get cache statistics for monitoring.
   */
  stats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? `${Math.round((this.hitCount / total) * 100)}%` : "N/A",
    };
  }

  /**
   * Remove expired entries (garbage collection).
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
}

// Singleton
export const responseCache = new ResponseCache();

// Common TTL presets (in milliseconds)
export const CacheTTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Common cache key prefixes
export const CacheKeys = {
  SETTINGS: "settings",
  CATEGORIES: "categories:list",
  TAGS: "tags:list",
  FEATURE_FLAGS: "flags:",
  TEMPLATES: "templates:list",
  MENUS: "menus:",
  PUBLIC_POST: "public:post:",
  PUBLIC_PAGE: "public:page:",
} as const;
