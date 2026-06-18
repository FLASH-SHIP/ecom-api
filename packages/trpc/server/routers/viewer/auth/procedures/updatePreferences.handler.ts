import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { Permissions } from "@ecom/lib/permissions";
import { authedProcedure } from "@ecom/trpc/server/trpc";
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
      userId: z.number().int().positive().optional(),
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
        message: "Không có quyền chỉnh sửa tùy chọn của người dùng này",
      });
    }

    const authService = getAuthService();
    if (data.theme !== undefined) {
      await authService.setTheme(effectiveUserId, data.theme);
    }
    return { success: true };
  });
