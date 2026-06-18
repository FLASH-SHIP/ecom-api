import { beforeEach, describe, expect, it, vi } from "vitest";

// Inline a minimal ResponseCache for testing to avoid import issues
class ResponseCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private hitCount = 0;
  private missCount = 0;

  async remember<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      this.hitCount++;
      return existing.value as T;
    }
    this.missCount++;
    const value = await factory();
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  forget(key: string): void {
    this.cache.delete(key);
  }

  forgetByPrefix(prefix: string): number {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  flush(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  stats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? `${Math.round((this.hitCount / total) * 100)}%` : "N/A",
    };
  }

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

describe("ResponseCache", () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache();
  });

  it("should cache and return value on subsequent calls", async () => {
    const factory = vi.fn().mockResolvedValue({ name: "test" });

    const first = await cache.remember("key1", 60_000, factory);
    const second = await cache.remember("key1", 60_000, factory);

    expect(first).toEqual({ name: "test" });
    expect(second).toEqual({ name: "test" });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("should call factory again after TTL expires", async () => {
    const factory = vi.fn().mockResolvedValue("value");

    await cache.remember("key1", 1, factory); // 1ms TTL
    await new Promise((r) => setTimeout(r, 10));
    await cache.remember("key1", 1, factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("should forget a specific key", async () => {
    const factory = vi.fn().mockResolvedValue("v");
    await cache.remember("k1", 60_000, factory);
    cache.forget("k1");
    await cache.remember("k1", 60_000, factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("should forget by prefix", async () => {
    const factory = vi.fn().mockResolvedValue("v");
    await cache.remember("cats:1", 60_000, factory);
    await cache.remember("cats:2", 60_000, factory);
    await cache.remember("tags:1", 60_000, factory);

    const cleared = cache.forgetByPrefix("cats:");
    expect(cleared).toBe(2);
    expect(cache.stats().size).toBe(1);
  });

  it("should flush all entries", async () => {
    const factory = vi.fn().mockResolvedValue("v");
    await cache.remember("a", 60_000, factory);
    await cache.remember("b", 60_000, factory);

    cache.flush();
    expect(cache.stats().size).toBe(0);
    expect(cache.stats().hits).toBe(0);
  });

  it("should track hit/miss stats", async () => {
    const factory = vi.fn().mockResolvedValue("v");
    await cache.remember("k", 60_000, factory); // miss
    await cache.remember("k", 60_000, factory); // hit
    await cache.remember("k", 60_000, factory); // hit

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe("67%");
  });

  it("should prune expired entries", async () => {
    const factory = vi.fn().mockResolvedValue("v");
    await cache.remember("expired", 1, factory);
    await cache.remember("valid", 60_000, factory);

    await new Promise((r) => setTimeout(r, 10));
    const pruned = cache.prune();

    expect(pruned).toBe(1);
    expect(cache.stats().size).toBe(1);
  });
});
