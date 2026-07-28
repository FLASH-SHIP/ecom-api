import { createLogger } from "@flash-ship/ecom-lib/logger";
import { middleware } from "@flash-ship/ecom-trpc/server/init";

const log = createLogger("tRPC:Request");

const isEnabled = () => process.env.LOG_REQUESTS !== "false";

/**
 * Structured request/response logging middleware for tRPC procedures.
 *
 * Logs: procedure path, execution time, user ID, status.
 * Does NOT log request/response bodies to avoid PII exposure.
 *
 * Disable via LOG_REQUESTS=false in .env for zero overhead.
 *
 * Inspired by Laravel's request logging and Morgan-style logging.
 */
export const requestLogger = middleware(async ({ ctx, path, type, next }) => {
  if (!isEnabled()) return next();
  const start = Date.now();
  const userId = (ctx as Record<string, unknown>).user
    ? ((ctx as Record<string, { id?: string }>).user?.id ?? null)
    : null;

  try {
    const result = await next();
    const duration = Date.now() - start;

    // Only log mutations and slow queries (>500ms) to reduce noise
    if (type === "mutation" || duration > 500) {
      log.info("Request completed", {
        path,
        type,
        userId,
        duration: `${duration}ms`,
        status: "ok",
      });
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    log.warn("Request failed", {
      path,
      type,
      userId,
      duration: `${duration}ms`,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
});

/**
 * Verbose request logger — logs ALL requests including queries.
 * Use only in development or for debugging specific issues.
 */
export const verboseRequestLogger = middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const userId = (ctx as Record<string, unknown>).user
    ? ((ctx as Record<string, { id?: string }>).user?.id ?? null)
    : null;

  log.info("Request started", { path, type, userId });

  try {
    const result = await next();
    const duration = Date.now() - start;

    log.info("Request completed", {
      path,
      type,
      userId,
      duration: `${duration}ms`,
      status: "ok",
    });

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    log.error("Request failed", {
      path,
      type,
      userId,
      duration: `${duration}ms`,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    throw err;
  }
});
