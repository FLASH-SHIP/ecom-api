import { beforeEach, describe, expect, it } from "vitest";

// Inline a minimal ContentLockService for testing
interface ContentLock {
  entityType: "post" | "page";
  entityId: number;
  userId: number;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}

class ContentLockService {
  private locks = new Map<string, ContentLock>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000;

  acquire(
    entityType: "post" | "page",
    entityId: number,
    userId: number,
    userName: string,
  ): { acquired: boolean; lock: ContentLock } {
    const key = `${entityType}:${entityId}`;
    const existing = this.locks.get(key);

    if (existing && existing.userId === userId) {
      existing.expiresAt = Date.now() + this.DEFAULT_TTL_MS;
      existing.lockedAt = Date.now();
      return { acquired: true, lock: existing };
    }

    if (existing && existing.expiresAt > Date.now()) {
      return { acquired: false, lock: existing };
    }

    const lock: ContentLock = {
      entityType,
      entityId,
      userId,
      userName,
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.DEFAULT_TTL_MS,
    };
    this.locks.set(key, lock);
    return { acquired: true, lock };
  }

  release(entityType: "post" | "page", entityId: number, userId: number): boolean {
    const key = `${entityType}:${entityId}`;
    const existing = this.locks.get(key);
    if (!existing) return true;
    if (existing.userId !== userId) return false;
    this.locks.delete(key);
    return true;
  }

  check(entityType: "post" | "page", entityId: number): ContentLock | null {
    const key = `${entityType}:${entityId}`;
    const existing = this.locks.get(key);
    if (!existing) return null;
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return null;
    }
    return existing;
  }

  heartbeat(entityType: "post" | "page", entityId: number, userId: number): boolean {
    const key = `${entityType}:${entityId}`;
    const existing = this.locks.get(key);
    if (!existing || existing.userId !== userId) return false;
    existing.expiresAt = Date.now() + this.DEFAULT_TTL_MS;
    return true;
  }

  forceRelease(entityType: "post" | "page", entityId: number): void {
    this.locks.delete(`${entityType}:${entityId}`);
  }

  getActiveLocks(): ContentLock[] {
    const now = Date.now();
    const active: ContentLock[] = [];
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        active.push(lock);
      } else {
        this.locks.delete(key);
      }
    }
    return active;
  }
}

describe("ContentLockService", () => {
  let service: ContentLockService;

  beforeEach(() => {
    service = new ContentLockService();
  });

  it("should acquire a lock on unlocked content", () => {
    const result = service.acquire("post", 1, 100, "Alice");
    expect(result.acquired).toBe(true);
    expect(result.lock.userId).toBe(100);
    expect(result.lock.userName).toBe("Alice");
  });

  it("should prevent another user from acquiring a locked content", () => {
    service.acquire("post", 1, 100, "Alice");
    const result = service.acquire("post", 1, 200, "Bob");
    expect(result.acquired).toBe(false);
    expect(result.lock.userName).toBe("Alice");
  });

  it("should allow the same user to re-acquire (extend) their lock", () => {
    service.acquire("post", 1, 100, "Alice");
    const result = service.acquire("post", 1, 100, "Alice");
    expect(result.acquired).toBe(true);
  });

  it("should release a lock by the owner", () => {
    service.acquire("post", 1, 100, "Alice");
    const released = service.release("post", 1, 100);
    expect(released).toBe(true);
    expect(service.check("post", 1)).toBeNull();
  });

  it("should not allow another user to release a lock", () => {
    service.acquire("post", 1, 100, "Alice");
    const released = service.release("post", 1, 200);
    expect(released).toBe(false);
  });

  it("should return null for unlocked content", () => {
    expect(service.check("post", 999)).toBeNull();
  });

  it("should check existing lock", () => {
    service.acquire("page", 5, 100, "Alice");
    const lock = service.check("page", 5);
    expect(lock).not.toBeNull();
    expect(lock?.userId).toBe(100);
  });

  it("should support heartbeat to extend lock", () => {
    service.acquire("post", 1, 100, "Alice");
    const extended = service.heartbeat("post", 1, 100);
    expect(extended).toBe(true);
  });

  it("should reject heartbeat from wrong user", () => {
    service.acquire("post", 1, 100, "Alice");
    const extended = service.heartbeat("post", 1, 200);
    expect(extended).toBe(false);
  });

  it("should force release by admin", () => {
    service.acquire("post", 1, 100, "Alice");
    service.forceRelease("post", 1);
    expect(service.check("post", 1)).toBeNull();
  });

  it("should list active locks", () => {
    service.acquire("post", 1, 100, "Alice");
    service.acquire("page", 2, 200, "Bob");
    const locks = service.getActiveLocks();
    expect(locks).toHaveLength(2);
  });

  it("should isolate locks between different content types", () => {
    service.acquire("post", 1, 100, "Alice");
    const result = service.acquire("page", 1, 200, "Bob");
    expect(result.acquired).toBe(true);
  });
});
