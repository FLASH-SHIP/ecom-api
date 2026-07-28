import { PostPolicy } from "@ecom/features/blog/policies/PostPolicy";
import { getPostService } from "@ecom/features/di/containers/BlogService";
import { middleware } from "@flash-ship/ecom-trpc/server/init";
import { TRPCError } from "@trpc/server";

/**
 * tRPC middleware to enforce resource-level policies on blog posts.
 */
export function requirePostPolicy(action: "canUpdate" | "canDelete") {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: authenticates, checks input format, loads resource, and evaluates domain permission policy
  return middleware(async ({ ctx, input, next }) => {
    const user = ctx.user;
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const payload = input as { id?: number };
    const postId = payload?.id;
    if (typeof postId !== "number") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing resource ID in query/mutation",
      });
    }

    try {
      const post = await getPostService().getPost(postId);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }

      const isAllowed = PostPolicy[action](user, post);
      if (!isAllowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action on this resource",
        });
      }

      return next({
        ctx: {
          ...ctx,
          user,
          post,
        },
      });
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : "Authorization check failed",
      });
    }
  });
}
