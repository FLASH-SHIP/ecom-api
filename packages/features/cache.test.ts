import { MemoryCache } from "@ecom/lib/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("MemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should store and retrieve values", () => {
    const cache = new MemoryCache<string>(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("should return undefined for missing keys", () => {
    const cache = new MemoryCache<string>(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should expire values after TTL", () => {
    const cache = new MemoryCache<string>(1000);
    cache.set("key", "value");

    vi.advanceTimersByTime(999);
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(2);
    expect(cache.get("key")).toBeUndefined();
  });

  it("should use custom TTL when provided", () => {
    const cache = new MemoryCache<string>(1000);
    cache.set("key", "value", 500);

    vi.advanceTimersByTime(499);
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(2);
    expect(cache.get("key")).toBeUndefined();
  });

  it("should invalidate a specific key", () => {
    const cache = new MemoryCache<string>(1000);
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.invalidate("key1");

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBe("value2");
  });

  it("should invalidate keys by prefix", () => {
    const cache = new MemoryCache<string>(1000);
    cache.set("user:1", "alice");
    cache.set("user:2", "bob");
    cache.set("post:1", "hello");

    cache.invalidatePrefix("user:");

    expect(cache.get("user:1")).toBeUndefined();
    expect(cache.get("user:2")).toBeUndefined();
    expect(cache.get("post:1")).toBe("hello");
  });

  it("should clear all keys", () => {
    const cache = new MemoryCache<string>(1000);
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.clear();

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });
});
