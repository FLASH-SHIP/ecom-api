import { createLogger } from "@ecom/lib/logger";

const log = createLogger("HookSystem");

type HookHandler = (...args: unknown[]) => Promise<void> | void;
type FilterHandler<T = unknown> = (value: T, ...args: unknown[]) => Promise<T> | T;

/**
 * WordPress-inspired hook/filter system for CMS extensibility.
 *
 * Actions: Fire-and-forget side effects (e.g., send notification after publish)
 * Filters: Transform data through a pipeline (e.g., modify content before save)
 *
 * Usage:
 *   hooks.addAction("post.published", async (post) => { ... });
 *   hooks.addFilter("post.content", async (content) => { ... });
 *   await hooks.doAction("post.published", post);
 *   const processed = await hooks.applyFilters("post.content", rawContent);
 */
class HookSystem {
  private actions = new Map<string, Array<{ handler: HookHandler; priority: number }>>();
  private filters = new Map<string, Array<{ handler: FilterHandler; priority: number }>>();

  /**
   * Register an action handler.
   * @param name Hook name (e.g., "post.created", "comment.approved")
   * @param handler Async/sync handler function
   * @param priority Lower = runs first (default 10)
   */
  addAction(name: string, handler: HookHandler, priority = 10): void {
    if (!this.actions.has(name)) {
      this.actions.set(name, []);
    }
    this.actions.get(name)?.push({ handler, priority });
    this.actions.get(name)?.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register a filter handler.
   */
  addFilter<T = unknown>(name: string, handler: FilterHandler<T>, priority = 10): void {
    if (!this.filters.has(name)) {
      this.filters.set(name, []);
    }
    this.filters.get(name)?.push({ handler: handler as FilterHandler, priority });
    this.filters.get(name)?.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute all action handlers for a hook.
   * Errors are logged but don't stop execution.
   */
  async doAction(name: string, ...args: unknown[]): Promise<void> {
    const handlers = this.actions.get(name);
    if (!handlers || handlers.length === 0) return;

    for (const { handler } of handlers) {
      try {
        await handler(...args);
      } catch (err) {
        log.error(`Hook action "${name}" failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Apply all filter handlers to a value, returning the transformed result.
   */
  async applyFilters<T = unknown>(name: string, value: T, ...args: unknown[]): Promise<T> {
    const handlers = this.filters.get(name);
    if (!handlers || handlers.length === 0) return value;

    let result = value;
    for (const { handler } of handlers) {
      try {
        result = (await (handler as FilterHandler<T>)(result, ...args)) as T;
      } catch (err) {
        log.error(`Hook filter "${name}" failed`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return result;
  }

  /**
   * Remove all handlers for a specific hook.
   */
  removeAction(name: string): void {
    this.actions.delete(name);
  }

  removeFilter(name: string): void {
    this.filters.delete(name);
  }

  /**
   * Check if any handlers are registered for a hook.
   */
  hasAction(name: string): boolean {
    return (this.actions.get(name)?.length ?? 0) > 0;
  }

  hasFilter(name: string): boolean {
    return (this.filters.get(name)?.length ?? 0) > 0;
  }

  /**
   * Get a list of all registered hook names.
   */
  getRegisteredHooks(): { actions: string[]; filters: string[] } {
    return {
      actions: Array.from(this.actions.keys()),
      filters: Array.from(this.filters.keys()),
    };
  }
}

// Singleton global hook system
export const hooks = new HookSystem();

/**
 * Pre-defined hook names for type-safe usage.
 */
export const HookNames = {
  // Post lifecycle
  POST_CREATED: "post.created",
  POST_UPDATED: "post.updated",
  POST_PUBLISHED: "post.published",
  POST_DELETED: "post.deleted",
  POST_RESTORED: "post.restored",

  // Page lifecycle
  PAGE_CREATED: "page.created",
  PAGE_UPDATED: "page.updated",
  PAGE_PUBLISHED: "page.published",
  PAGE_DELETED: "page.deleted",

  // Content filters
  POST_CONTENT_BEFORE_SAVE: "post.content.beforeSave",
  POST_CONTENT_BEFORE_RENDER: "post.content.beforeRender",
  PAGE_CONTENT_BEFORE_SAVE: "page.content.beforeSave",

  // Comment lifecycle
  COMMENT_CREATED: "comment.created",
  COMMENT_APPROVED: "comment.approved",
  COMMENT_DELETED: "comment.deleted",

  // Media
  MEDIA_UPLOADED: "media.uploaded",
  MEDIA_DELETED: "media.deleted",

  // Auth
  USER_LOGGED_IN: "user.loggedIn",
  USER_REGISTERED: "user.registered",
  MEMBER_REGISTERED: "member.registered",
} as const;
