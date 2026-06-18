import { RedisRateLimiter } from "@ecom/lib/redis";
import { middleware } from "@ecom/trpc/server/init";
import { TRPCError } from "@trpc/server";

function getClientKey(ctx: { ip?: string | null }): string {
  return ctx.ip ?? "unknown";
}

/**
 * Redis-backed rate limiter middleware for tRPC procedures.
 *
 * Uses sliding window algorithm via Redis sorted sets for accurate,
 * distributed rate limiting across multiple server instances.
 *
 * Falls back to allow-all if Redis is unavailable (fail-open).
 */
export function rateLimit(maxRequests: number, windowSeconds: number, prefix = "global") {
  const limiter = new RedisRateLimiter(prefix, maxRequests, windowSeconds);

  return middleware(async ({ ctx, next }) => {
    const clientKey = getClientKey(ctx);

    try {
      const result = await limiter.check(clientKey);

      if (!result.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many requests. Please try again in ${result.resetIn} seconds.`,
        });
      }
    } catch (err) {
      // Re-throw TRPCError (rate limit exceeded)
      if (err instanceof TRPCError) throw err;

      // Redis connection failure → fail-open (allow request through)
      // This prevents Redis outages from blocking all requests
    }

    return next();
  });
}

/**
 * Pre-configured rate limiters for common use cases.
 */
export const rateLimiters = {
  /** Auth endpoints: 10 requests per 15 minutes per IP */
  auth: rateLimit(10, 15 * 60, "auth"),

  /** Registration: 5 requests per hour per IP */
  register: rateLimit(5, 60 * 60, "register"),

  /** Public API: 60 requests per minute per IP */
  publicApi: rateLimit(60, 60, "public"),

  /** Mutations: 30 requests per minute per IP */
  mutation: rateLimit(30, 60, "mutation"),

  /** Contact form: 5 submissions per hour per IP */
  contact: rateLimit(5, 60 * 60, "contact"),

  /** File upload: 20 uploads per minute per IP */
  upload: rateLimit(20, 60, "upload"),

  /** Search: 30 queries per minute per IP */
  search: rateLimit(30, 60, "search"),
};
