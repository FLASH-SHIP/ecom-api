import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { Permissions } from "@ecom/lib/permissions";
import { authedProcedure } from "@ecom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Fetch any user's profile data.
 * - isSelf: always allowed
 * - others: requires USERS_READ permission
 */
export const getUserProfile = authedProcedure
  .input(z.object({ userId: z.number().int().positive() }))
  .query(async ({ ctx, input }) => {
    const isSelf = ctx.user.id === input.userId;
    const canRead = ctx.user.permissions.includes(Permissions.USERS_READ);

    if (!isSelf && !canRead) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "users.profile.forbiddenRead",
      });
    }

    const authService = getAuthService();
    return authService.getUserWithPermissions(input.userId);
  });
