import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./createContext";

/**
 * Singleton tRPC instance — isolated to break circular dependencies.
 *
 * Middleware files import `middleware` from here instead of `trpc.ts`,
 * which prevents the "Cannot access 'middleware' before initialization"
 * ReferenceError caused by circular ESM evaluation order.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;
