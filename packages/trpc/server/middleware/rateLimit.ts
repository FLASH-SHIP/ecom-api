import { RedisRateLimiter } from "@flash-ship/ecom-lib/redis";
import { middleware } from "@flash-ship/ecom-trpc/server/init";
import { TRPCError } from "@trpc/server";

function getClientKey(ctx: { ip?: string | null }): string {
  return ctx.ip ?? "unknown";
}

export type RateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
  key: string;
  enabled?: boolean;
} | null;

/**
 * Dynamic Redis-backed rate limiter middleware for tRPC procedures.
 * Evaluates the limit configuration dynamically at request-time based on context and input.
 */
export function dynamicRateLimit(
  configFn: (ctx: unknown, input: unknown) => RateLimitConfig,
  prefix = "global",
) {
  const limiters = new Map<string, RedisRateLimiter>();

  return middleware(async ({ ctx, input, next }) => {
    const config = configFn(ctx, input);

    if (!config || config.enabled === false) {
      return next();
    }

    const { maxRequests, windowSeconds, key } = config;
    const cacheKey = `${maxRequests}:${windowSeconds}`;

    let limiter = limiters.get(cacheKey);
    if (!limiter) {
      limiter = new RedisRateLimiter(prefix, maxRequests, windowSeconds);
      limiters.set(cacheKey, limiter);
    }

    try {
      const result = await limiter.check(key);

      if (!result.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many requests. Please try again in ${result.resetIn} seconds.`,
        });
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }

    return next();
  });
}

/**
 * Redis-backed rate limiter middleware for tRPC procedures.
 * (Static backwards-compatible wrapper calling dynamicRateLimit)
 */
export function rateLimit(maxRequests: number, windowSeconds: number, prefix = "global") {
  return dynamicRateLimit(
    (ctx) => ({
      maxRequests,
      windowSeconds,
      key: getClientKey(ctx as { ip?: string | null }),
    }),
    prefix,
  );
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
