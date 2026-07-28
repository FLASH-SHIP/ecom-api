import { middleware } from "@flash-ship/ecom-trpc/server/init";
import { TRPCError } from "@trpc/server";

/**
 * Middleware factory that enforces one or more permissions on the current user.
 *
 * Usage:
 *   authedProcedure.use(requirePermission("blog.posts.create")).mutation(...)
 *
 * The user must have **all** listed permissions. If any is missing, a FORBIDDEN
 * error is thrown immediately — the handler never executes.
 */
export function requirePermission(...permissions: string[]) {
  return middleware(async ({ ctx, next }) => {
    const user = ctx.user;

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const hasWildcard = user.permissions.includes("*");
    if (!hasWildcard) {
      for (const perm of permissions) {
        if (!user.permissions.includes(perm)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Missing permission: ${perm}`,
          });
        }
      }
    }

    return next({ ctx: { ...ctx, user } });
  });
}
