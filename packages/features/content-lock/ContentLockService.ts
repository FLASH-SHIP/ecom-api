import { createLogger } from "@ecom/lib/logger";

const log = createLogger("ContentLock");

interface ContentLock {
  entityType: "post" | "page";
  entityId: number;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}

/**
 * In-memory content locking service to prevent concurrent editing.
 *
 * When a user starts editing a post/page, a lock is acquired.
 * Other users are warned that the content is being edited.
 * Locks auto-expire after a configurable timeout (default: 5 minutes).
 *
 * For multi-server deployments, this should be backed by Redis.
 */
class ContentLockService {
  private locks = new Map<string, ContentLock>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Try to acquire a lock on content.
   * Returns the lock if successful, or the existing lock holder if locked by another user.
   */
  acquire(
    entityType: "post" | "page",
    entityId: number,
    userId: string,
    userName: string,
  ): { acquired: boolean; lock: ContentLock } {
    const key = this.getKey(entityType, entityId);
    const existing = this.locks.get(key);

    // If locked by same user, extend the lock
    if (existing && existing.userId === userId) {
      existing.expiresAt = Date.now() + this.DEFAULT_TTL_MS;
      existing.lockedAt = Date.now();
      return { acquired: true, lock: existing };
    }

    // If locked by another user and not expired
    if (existing && existing.expiresAt > Date.now()) {
      return { acquired: false, lock: existing };
    }

    // No lock or expired — acquire it
    const lock: ContentLock = {
      entityType,
      entityId,
      userId,
      userName,
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.DEFAULT_TTL_MS,
    };

    this.locks.set(key, lock);
    log.info(`Lock acquired: ${entityType}:${entityId} by ${userName}`);
    return { acquired: true, lock };
  }

  /**
   * Release a lock (only the lock holder can release it).
   */
  release(entityType: "post" | "page", entityId: number, userId: string): boolean {
    const key = this.getKey(entityType, entityId);
    const existing = this.locks.get(key);

    if (!existing) return true;
    if (existing.userId !== userId) return false;

    this.locks.delete(key);
    log.info(`Lock released: ${entityType}:${entityId}`);
    return true;
  }

  /**
   * Check if content is locked (returns lock info or null).
   */
  check(entityType: "post" | "page", entityId: number): ContentLock | null {
    const key = this.getKey(entityType, entityId);
    const existing = this.locks.get(key);

    if (!existing) return null;

    // Auto-expire
    if (existing.expiresAt <= Date.now()) {
      this.locks.delete(key);
      return null;
    }

    return existing;
  }

  /**
   * Heartbeat — extend a lock (called periodically by the editor).
   */
  heartbeat(entityType: "post" | "page", entityId: number, userId: string): boolean {
    const key = this.getKey(entityType, entityId);
    const existing = this.locks.get(key);

    if (!existing || existing.userId !== userId) return false;

    existing.expiresAt = Date.now() + this.DEFAULT_TTL_MS;
    return true;
  }

  /**
   * Force release a lock (admin only).
   */
  forceRelease(entityType: "post" | "page", entityId: number): void {
    const key = this.getKey(entityType, entityId);
    this.locks.delete(key);
    log.warn(`Lock force-released: ${entityType}:${entityId}`);
  }

  /**
   * Get all active locks (for admin monitoring).
   */
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

  /**
   * Clean up expired locks.
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  private getKey(entityType: string, entityId: number): string {
    return `${entityType}:${entityId}`;
  }
}

// Singleton
export const contentLockService = new ContentLockService();
export type { ContentLock };
