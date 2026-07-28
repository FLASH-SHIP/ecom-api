import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Get preferences (theme, locale) for any user.
 * - isSelf: always allowed
 * - Other user: requires USERS_READ permission (admin)
 */
export const getPreferences = authedProcedure
  .input(
    z.object({
      /** Target user. Defaults to logged-in user. */
      userId: z.string().min(1).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const effectiveUserId = input.userId ?? ctx.user.id;
    const isSelf = effectiveUserId === ctx.user.id;
    const canRead = ctx.user.permissions.includes(Permissions.USERS_READ);

    if (!isSelf && !canRead) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "users.profile.forbiddenPreferencesRead",
      });
    }

    const authService = getAuthService();
    const theme = await authService.getTheme(effectiveUserId);
    return { theme };
  });
