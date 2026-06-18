/**
 * Simple in-memory cache with TTL.
 *
 * Used for rarely-changing data like category trees, settings, and permissions
 * to reduce database round-trips on hot paths.
 */
export class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

/** Shared cache instances — one per data type for isolation. */
export const categoryCache = new MemoryCache<unknown>(60_000);
export const settingsCache = new MemoryCache<unknown>(120_000);
export const permissionsCache = new MemoryCache<unknown>(300_000);
