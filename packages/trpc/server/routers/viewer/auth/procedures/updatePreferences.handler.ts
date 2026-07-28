import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Update preferences (theme, locale) for any user.
 * - isSelf: always allowed
 * - Other user: requires USERS_UPDATE permission (admin, like Botble)
 */
export const updatePreferences = authedProcedure
  .input(
    z.object({
      /** Target user. Defaults to logged-in user. */
      userId: z.string().min(1).optional(),
      theme: z.enum(["light", "dark"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId: targetId, ...data } = input;
    const effectiveUserId = targetId ?? ctx.user.id;
    const isSelf = effectiveUserId === ctx.user.id;
    const canUpdate = ctx.user.permissions.includes(Permissions.USERS_UPDATE);

    if (!isSelf && !canUpdate) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "users.profile.forbiddenPreferencesUpdate",
      });
    }

    const authService = getAuthService();
    if (data.theme !== undefined) {
      await authService.setTheme(effectiveUserId, data.theme);
    }
    return { success: true };
  });
