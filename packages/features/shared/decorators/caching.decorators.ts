import { responseCache } from "@ecom/features/cache/ResponseCache";

export interface CacheOptions {
  /**
   * Custom key generator function that maps method arguments to a string.
   */
  // biome-ignore lint/suspicious/noExplicitAny: custom key map needs to accept any method parameters
  keyMap?: (...args: any[]) => string;
}

/**
 * Cacheable decorator - Cache method return value.
 * Uses responseCache.remember under the hood.
 * Cache key pattern: `${prefix}:${args.join(':')}`
 */
export function Cacheable(prefix: string, ttlMs: number, options?: CacheOptions) {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      let cacheKey: string;
      if (options?.keyMap) {
        cacheKey = `${prefix}:${options.keyMap(...args)}`;
      } else {
        const argsString = args
          .map((arg) => (arg && typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
          .join(":");
        cacheKey = `${prefix}:${argsString}`;
      }

      return responseCache.remember(cacheKey, ttlMs, async () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

export interface EvictOptions {
  /**
   * Custom key generator function that maps method arguments to a string.
   */
  // biome-ignore lint/suspicious/noExplicitAny: custom key map needs to accept any method parameters
  keyMap?: (...args: any[]) => string;
}

/**
 * CacheEvict decorator - Invalidate cache key or pattern.
 */
export function CacheEvict(prefix: string, evictAll = false, options?: EvictOptions) {
  return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      if (evictAll) {
        responseCache.forgetByPrefix(prefix);
      } else {
        let cacheKey: string;
        if (options?.keyMap) {
          cacheKey = `${prefix}:${options.keyMap(...args)}`;
        } else {
          const firstArgString = args[0] !== undefined ? String(args[0]) : "";
          cacheKey = `${prefix}:${firstArgString}`;
        }
        responseCache.forget(cacheKey);
      }

      return result;
    };

    return descriptor;
  };
}
