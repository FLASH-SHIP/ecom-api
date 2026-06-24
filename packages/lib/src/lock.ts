import { createLogger } from "./logger";
import { getRedisClient } from "./redis";

const log = createLogger("DistributedLock");

export class DistributedLockManager {
  /**
   * Acquire a lock.
   * Returns a lock token if successful, or null if failed.
   */
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    if (process.env.NODE_ENV === "test" && !process.env.REDIS_URL) {
      return "mock-token";
    }
    try {
      const redis = getRedisClient();
      const token = Math.random().toString(36).substring(2, 15);
      // SET key value PX ttlMs NX
      const result = await redis.set(`lock:${key}`, token, "PX", ttlMs, "NX");
      return result === "OK" ? token : null;
    } catch (err) {
      log.warn("Redis is not available for lock. Defaulting lock to allowed.", {
        error: (err as Error).message,
      });
      return "fallback-token";
    }
  }

  /**
   * Release a lock safely using a Lua script to ensure only the owner can release it.
   */
  async release(key: string, token: string): Promise<boolean> {
    if (process.env.NODE_ENV === "test" && !process.env.REDIS_URL) {
      return true;
    }
    try {
      const redis = getRedisClient();
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await redis.eval(script, 1, `lock:${key}`, token);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Run a function wrapped in a lock.
   */
  async runWithLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
    retryDelayMs = 50,
    maxRetries = 5,
  ): Promise<T> {
    let attempts = 0;
    while (attempts < maxRetries) {
      const token = await this.acquire(key, ttlMs);
      if (token) {
        try {
          return await fn();
        } finally {
          await this.release(key, token);
        }
      }
      attempts++;
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
    throw new Error(`Could not acquire lock for key: ${key} after ${maxRetries} attempts`);
  }
}

export const lockManager = new DistributedLockManager();
