import { createLogger } from "@ecom/lib/logger";

const log = createLogger("EventBus");

/**
 * Type-safe event definitions for all CMS domain events.
 * Inspired by Laravel Events/Listeners pattern.
 */
export interface EventMap {
  // Post lifecycle
  "post.created": { postId: number; authorId: string; title: string };
  "post.updated": { postId: number; authorId: string; changes: string[] };
  "post.published": { postId: number; slug: string; authorId: string };
  "post.unpublished": { postId: number; authorId: string };
  "post.deleted": { postId: number; authorId: string; permanent: boolean };
  "post.restored": { postId: number; authorId: string };
  "post.statusChanged": {
    postId: number;
    from: string;
    to: string;
    authorId: string;
  };

  // Page lifecycle
  "page.created": { pageId: number; authorId: string; title: string };
  "page.updated": { pageId: number; authorId: string };
  "page.published": { pageId: number; slug: string };
  "page.deleted": { pageId: number; authorId: string };

  // Comment lifecycle
  "comment.created": {
    commentId: number;
    postId: number;
    authorName: string;
  };
  "comment.approved": { commentId: number; postId: number };
  "comment.rejected": { commentId: number; postId: number };
  "comment.deleted": { commentId: number; postId: number };

  // Media
  "media.uploaded": {
    fileId: number;
    fileName: string;
    size: number;
    uploadedBy: number;
  };
  "media.deleted": { fileId: number; fileName: string };

  // User/Auth
  "user.loggedIn": { userId: string; ip: string };
  "user.registered": { userId: string; email: string };
  "user.passwordChanged": { userId: string };

  // Member
  "member.registered": { memberId: string; email: string };
  "member.activated": { memberId: string };

  // Contact
  "contact.submitted": { contactId: number; email: string; subject: string };

  // System
  "system.backup.created": { exportedAt: string };
  "system.backup.restored": { importedAt: string };
  "cache.cleared": { pattern?: string };
}

type EventHandler<T> = (payload: T) => Promise<void> | void;

interface HandlerEntry<T> {
  handler: EventHandler<T>;
  priority: number;
  once: boolean;
}

/**
 * Type-safe event bus.
 *
 * Usage:
 *   eventBus.on("post.published", async ({ postId, slug }) => {
 *     await clearCache(`post:${slug}`);
 *   });
 *
 *   await eventBus.emit("post.published", { postId: 1, slug: "hello", authorId: 1 });
 */
class TypedEventBus {
  private handlers = new Map<string, HandlerEntry<unknown>[]>();

  /**
   * Register a persistent event listener.
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    priority = 10,
  ): () => void {
    return this.addHandler(event, handler as EventHandler<unknown>, priority, false);
  }

  /**
   * Register a one-time event listener (auto-removed after first trigger).
   */
  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    priority = 10,
  ): () => void {
    return this.addHandler(event, handler as EventHandler<unknown>, priority, true);
  }

  /**
   * Emit an event — runs all handlers in priority order.
   * Errors are logged but don't stop other handlers.
   */
  async emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
    const entries = this.handlers.get(event);
    if (!entries || entries.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      try {
        await entry.handler(payload);
      } catch (err) {
        log.error(`Event handler for "${event}" failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (entry.once) {
        toRemove.push(i);
      }
    }

    // Remove once-handlers in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      if (idx !== undefined) entries.splice(idx, 1);
    }
  }

  /**
   * Remove all handlers for a specific event.
   */
  off<K extends keyof EventMap>(event: K): void {
    this.handlers.delete(event);
  }

  /**
   * Check if any handlers are registered for an event.
   */
  hasListeners<K extends keyof EventMap>(event: K): boolean {
    return (this.handlers.get(event)?.length ?? 0) > 0;
  }

  /**
   * Get count of registered events.
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers (useful for testing).
   */
  clear(): void {
    this.handlers.clear();
  }

  private addHandler(
    event: string,
    handler: EventHandler<unknown>,
    priority: number,
    once: boolean,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    const entry: HandlerEntry<unknown> = { handler, priority, once };
    const entries = this.handlers.get(event) as HandlerEntry<unknown>[];
    entries.push(entry);
    entries.sort((a, b) => a.priority - b.priority);

    // Return unsubscribe function
    return () => {
      const idx = entries.indexOf(entry);
      if (idx !== -1) entries.splice(idx, 1);
    };
  }
}

// Singleton
export const eventBus = new TypedEventBus();
