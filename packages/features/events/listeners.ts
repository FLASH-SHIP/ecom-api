import { CacheKeys, responseCache } from "@ecom/features/cache/ResponseCache";
import { createLogger } from "@ecom/lib/logger";
import { eventBus } from "./EventBus";

const log = createLogger("EventListeners");

let registered = false;

export function registerEventListeners() {
  if (registered) return;
  registered = true;

  log.info("Registering domain event listeners...");

  // Cache invalidation listeners
  eventBus.on("post.published", ({ slug }) => {
    log.info(`Event [post.published]: invalidating cache for post: ${slug}`);
    responseCache.forget(`${CacheKeys.PUBLIC_POST}${slug}`);
    responseCache.forgetByPrefix(CacheKeys.CATEGORIES);
  });

  eventBus.on("post.unpublished", () => {
    log.info("Event [post.unpublished]: invalidating public post caches");
    responseCache.forgetByPrefix(CacheKeys.PUBLIC_POST);
  });

  eventBus.on("post.deleted", () => {
    log.info("Event [post.deleted]: invalidating public post caches");
    responseCache.forgetByPrefix(CacheKeys.PUBLIC_POST);
  });
}
