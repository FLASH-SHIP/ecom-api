import { disconnectRedis, getRedisClient, RedisCache, RedisRateLimiter } from "@ecom/lib/redis";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests for Redis cache and rate limiter.
 *
 * Requires local Redis on 127.0.0.1:6379.
 * Run with: TZ=UTC yarn vitest run redis
 */
describe("RedisCache", () => {
  const cache = new RedisCache<string>("test", 5);

  beforeAll(async () => {
    const redis = getRedisClient();
    await redis.connect();
  });

  afterEach(async () => {
    await cache.clear();
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  it("should store and retrieve values", async () => {
    await cache.set("key1", "hello");
    const result = await cache.get("key1");
    expect(result).toBe("hello");
  });

  it("should return undefined for missing keys", async () => {
    const result = await cache.get("nonexistent");
    expect(result).toBeUndefined();
  });

  it("should handle JSON objects", async () => {
    const data = { name: "test", count: 42 };
    const objCache = new RedisCache<typeof data>("test-obj", 10);

    await objCache.set("obj", data);
    const result = await objCache.get("obj");
    expect(result).toEqual(data);

    await objCache.clear();
  });

  it("should invalidate a specific key", async () => {
    await cache.set("a", "1");
    await cache.set("b", "2");

    await cache.invalidate("a");

    expect(await cache.get("a")).toBeUndefined();
    expect(await cache.get("b")).toBe("2");
  });

  it("should invalidate by prefix", async () => {
    await cache.set("user:1", "alice");
    await cache.set("user:2", "bob");
    await cache.set("post:1", "hello");

    await cache.invalidatePrefix("user:");

    expect(await cache.get("user:1")).toBeUndefined();
    expect(await cache.get("user:2")).toBeUndefined();
    expect(await cache.get("post:1")).toBe("hello");
  });

  it("should clear all keys", async () => {
    await cache.set("x", "1");
    await cache.set("y", "2");

    await cache.clear();

    expect(await cache.get("x")).toBeUndefined();
    expect(await cache.get("y")).toBeUndefined();
  });

  it("should expire after TTL", async () => {
    const shortCache = new RedisCache<string>("test-ttl", 1); // 1 second TTL
    await shortCache.set("temp", "value");

    const immediate = await shortCache.get("temp");
    expect(immediate).toBe("value");

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const expired = await shortCache.get("temp");
    expect(expired).toBeUndefined();
  });
});

describe("RedisRateLimiter", () => {
  const limiter = new RedisRateLimiter("test-rl", 3, 10);

  beforeAll(async () => {
    const redis = getRedisClient();
    await redis.connect();
  });

  afterEach(async () => {
    await limiter.reset("test-client");
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  it("should allow requests within limit", async () => {
    const r1 = await limiter.check("test-client");
    expect(r1.allowed).toBe(true);
    expect(r1.total).toBe(3);

    const r2 = await limiter.check("test-client");
    expect(r2.allowed).toBe(true);

    const r3 = await limiter.check("test-client");
    expect(r3.allowed).toBe(true);
  });

  it("should block when limit exceeded", async () => {
    // Use up all 3 requests
    await limiter.check("test-client");
    await limiter.check("test-client");
    await limiter.check("test-client");

    // 4th request should be blocked
    const r4 = await limiter.check("test-client");
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("should track remaining count", async () => {
    const r1 = await limiter.check("test-client");
    expect(r1.remaining).toBe(2);

    const r2 = await limiter.check("test-client");
    expect(r2.remaining).toBe(1);

    const r3 = await limiter.check("test-client");
    expect(r3.remaining).toBe(0);
  });

  it("should reset for a specific identifier", async () => {
    await limiter.check("test-client");
    await limiter.check("test-client");

    await limiter.reset("test-client");

    const result = await limiter.check("test-client");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should isolate different identifiers", async () => {
    await limiter.check("client-a");
    await limiter.check("client-a");
    await limiter.check("client-a");

    const clientB = await limiter.check("client-b");
    expect(clientB.allowed).toBe(true);
    expect(clientB.remaining).toBe(2);

    await limiter.reset("client-a");
    await limiter.reset("client-b");
  });
});
