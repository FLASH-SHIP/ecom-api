import { createLogger } from "./logger";
import { getRedisClient } from "./redis";

const log = createLogger("DistributedLock");

export type LockFallbackStrategy = "deny" | "allow";

export class DistributedLockManager {
  private fallbackStrategy: LockFallbackStrategy;

  constructor(fallbackStrategy: LockFallbackStrategy = "deny") {
    this.fallbackStrategy = fallbackStrategy;
  }

  /**
   * Acquire a lock.
   * Returns a lock token if successful, or null if failed.
   *
   * Fallback behavior when Redis is unavailable (PERF-03):
   * - "deny" (default): Returns null → lock acquisition fails → caller must handle
   * - "allow": Returns fallback token → operation proceeds (use for non-critical paths only)
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
      if (this.fallbackStrategy === "allow") {
        log.warn("Redis unavailable for lock — fallback to ALLOW (non-critical path)", {
          key,
          error: (err as Error).message,
        });
        return "fallback-token";
      }
      log.error("Redis unavailable for lock — DENYING acquisition (fail-closed)", {
        key,
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Release a lock safely using a Lua script to ensure only the owner can release it.
   */
  async release(key: string, token: string): Promise<boolean> {
    if (process.env.NODE_ENV === "test" && !process.env.REDIS_URL) {
      return true;
    }
    if (token === "fallback-token") {
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

/** Default lock manager: fail-closed (deny) for safety-critical operations */
export const lockManager = new DistributedLockManager("deny");

/** Lock manager for non-critical paths where operations can proceed without Redis */
export const softLockManager = new DistributedLockManager("allow");
