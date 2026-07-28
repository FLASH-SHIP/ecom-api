import { createLogger } from "@flash-ship/ecom-lib/logger";
import Redis from "ioredis";

const log = createLogger("Redis");

let _redis: Redis | null = null;

/**
 * Get or create a singleton Redis client.
 * Connection URL can be configured via REDIS_URL env var.
 */
export function getRedisClient(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    _redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 3000);
        return delay;
      },
      lazyConnect: true,
    });

    _redis.on("connect", () => log.info("Redis connected"));
    _redis.on("error", (err) => log.error("Redis error", { error: err.message }));
  }

  return _redis;
}

/**
 * Disconnect the Redis client gracefully.
 */
export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    log.info("Redis disconnected");
  }
}

/**
 * Non-blocking key deletion using cursor-based SCAN.
 * Unlike KEYS which blocks the Redis single-thread, SCAN iterates
 * incrementally and is safe for production use (PERF-01).
 */
async function scanAndDelete(redis: Redis, pattern: string): Promise<void> {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

/**
 * Redis-backed cache with TTL — drop-in replacement for MemoryCache on hot paths.
 *
 * Serializes values to JSON. For complex types, ensure they are JSON-serializable.
 */
export class RedisCache<T> {
  private prefix: string;
  private defaultTtlSeconds: number;

  constructor(prefix: string, defaultTtlSeconds = 60) {
    this.prefix = prefix;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  private key(k: string): string {
    return `cache:${this.prefix}:${k}`;
  }

  async get(key: string): Promise<T | undefined> {
    try {
      const redis = getRedisClient();
      const raw = await redis.get(this.key(key));
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      log.error("Redis get cache error, falling back to database", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  }

  async set(key: string, data: T, ttlSeconds?: number): Promise<void> {
    try {
      const redis = getRedisClient();
      const ttl = ttlSeconds ?? this.defaultTtlSeconds;
      await redis.set(this.key(key), JSON.stringify(data), "EX", ttl);
    } catch (err: unknown) {
      log.error("Redis set cache error", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(this.key(key));
    } catch (err: unknown) {
      log.error("Redis invalidate cache error", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Invalidate all keys matching a prefix using cursor-based SCAN.
   * SCAN is non-blocking unlike KEYS which does a full O(N) scan (PERF-01).
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const pattern = `cache:${this.prefix}:${prefix}*`;
      await scanAndDelete(redis, pattern);
    } catch (err: unknown) {
      log.error("Redis invalidatePrefix cache error", {
        prefix,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Clear all keys for this cache namespace using cursor-based SCAN (PERF-01).
   */
  async clear(): Promise<void> {
    try {
      const redis = getRedisClient();
      const pattern = `cache:${this.prefix}:*`;
      await scanAndDelete(redis, pattern);
    } catch (err: unknown) {
      log.error("Redis clear cache error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Redis-backed sliding window rate limiter.
 *
 * Uses sorted sets for precise sliding window counting.
 *
 * Usage:
 *   const limiter = new RedisRateLimiter("api", 100, 60);
 *   const { allowed, remaining, resetIn } = await limiter.check(clientIp);
 */
export class RedisRateLimiter {
  private prefix: string;
  private maxRequests: number;
  private windowSeconds: number;

  constructor(prefix: string, maxRequests: number, windowSeconds: number) {
    this.prefix = prefix;
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
  }

  private key(identifier: string): string {
    return `ratelimit:${this.prefix}:${identifier}`;
  }

  /**
   * Check rate limit for an identifier.
   * Optimized: checks count BEFORE adding entry to avoid
   * unnecessary add+remove for rejected requests (PERF-05).
   */
  async check(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number;
    total: number;
  }> {
    const redis = getRedisClient();
    const key = this.key(identifier);
    const now = Date.now();
    const windowStart = now - this.windowSeconds * 1000;

    // Step 1: Clean expired + count current entries
    const cleanPipeline = redis.pipeline();
    cleanPipeline.zremrangebyscore(key, 0, windowStart);
    cleanPipeline.zcard(key);
    const results = await cleanPipeline.exec();

    const currentCount = (results?.[1]?.[1] as number) ?? 0;
    const allowed = currentCount < this.maxRequests;

    // Step 2: Only add the entry if the request is allowed
    if (allowed) {
      const addPipeline = redis.pipeline();
      addPipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
      addPipeline.expire(key, this.windowSeconds);
      await addPipeline.exec();
    }

    const remaining = Math.max(0, this.maxRequests - currentCount - (allowed ? 1 : 0));

    // Calculate reset time from oldest entry
    let resetIn = this.windowSeconds;
    if (currentCount > 0) {
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      if (oldest.length >= 2) {
        const oldestTime = Number.parseInt(oldest[1] ?? "0", 10);
        resetIn = Math.max(0, Math.ceil((oldestTime + this.windowSeconds * 1000 - now) / 1000));
      }
    }

    return { allowed, remaining, resetIn, total: this.maxRequests };
  }

  async reset(identifier: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(this.key(identifier));
  }
}
