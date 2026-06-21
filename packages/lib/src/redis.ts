import { createLogger } from "@ecom/lib/logger";
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
    const redis = getRedisClient();
    const raw = await redis.get(this.key(key));
    if (!raw) return undefined;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set(key: string, data: T, ttlSeconds?: number): Promise<void> {
    const redis = getRedisClient();
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    await redis.set(this.key(key), JSON.stringify(data), "EX", ttl);
  }

  async invalidate(key: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(this.key(key));
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    const redis = getRedisClient();
    const pattern = `cache:${this.prefix}:${prefix}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async clear(): Promise<void> {
    const redis = getRedisClient();
    const pattern = `cache:${this.prefix}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
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

    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Count remaining entries in window
    pipeline.zcard(key);
    // Add current request
    pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);
    // Set expiry on the key
    pipeline.expire(key, this.windowSeconds);

    const results = await pipeline.exec();

    const currentCount = (results?.[1]?.[1] as number) ?? 0;
    const allowed = currentCount < this.maxRequests;
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

    if (!allowed) {
      // Remove the entry we just added since request is rejected
      const members = await redis.zrangebyscore(key, now, now);
      if (members.length > 0) {
        const lastMember = members[members.length - 1];
        if (lastMember) await redis.zrem(key, lastMember);
      }
    }

    return { allowed, remaining, resetIn, total: this.maxRequests };
  }

  async reset(identifier: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(this.key(identifier));
  }
}
