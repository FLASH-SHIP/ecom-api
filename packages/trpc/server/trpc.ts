import { loggerContext } from "@flash-ship/ecom-lib/logger";
import { handleTRPCError } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { TRPCError } from "@trpc/server";
import { createCallerFactory, middleware, publicProcedure, router } from "./init";

export { createCallerFactory, middleware, publicProcedure, router };

/**
 * Error handler middleware — wraps handleTRPCError to map service errors to tRPC codes.
 */
const errorHandler = middleware(async ({ next }) => {
  return handleTRPCError(() => next());
});

/**
 * Middleware that enforces authentication.
 * Throws UNAUTHORIZED if no user is in context.
 */
const enforceUserIsAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  loggerContext.enterWith({
    traceId: "",
    userId: ctx.user.id,
    ipAddress: ctx.ip || undefined,
    userAgent: ctx.userAgent || undefined,
  });
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure — requires authentication.
 */
export const authedProcedure = publicProcedure
  .use(requestLogger)
  .use(enforceUserIsAuthed)
  .use(errorHandler);

export { requirePermission } from "./middleware/requirePermission";
