import { getRedisClient } from "@flash-ship/ecom-lib/redis";

/**
 * Shared session cache utilities for Redis-backed NextAuth sessions.
 * Used by both admin and customer auth to avoid duplication.
 */

/** Try to get a cached session payload from Redis */
export async function getCachedSession(cacheKey: string): Promise<Record<string, unknown> | null> {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Fallback to DB query on Redis failure
  }
  return null;
}

/** Cache a session payload in Redis with TTL */
export async function setCachedSession(
  cacheKey: string,
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(cacheKey, JSON.stringify(payload), "EX", ttlSeconds);
  } catch {
    // Ignore cache save failures — DB is the source of truth
  }
}

/** Invalidate a cached session in Redis */
export async function invalidateCachedSession(cacheKey: string): Promise<void> {
  try {
    await getRedisClient().del(cacheKey);
  } catch {
    // Ignore cache invalidation failures
  }
}
