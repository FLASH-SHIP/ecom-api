import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { rateLimiters } from "@flash-ship/ecom-trpc/server/middleware/rateLimit";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Self-serve password change with conditional current-password verification.
 *
 * Logic:
 * - isSelf  → currentPassword is required and verified against stored hash
 * - isAdmin (has USERS_UPDATE) viewing another user → skip currentPassword
 * - Neither → 403 Forbidden
 */
export const changePasswordSelf = authedProcedure
  // 10 attempts per 15 min per IP — brute-force protection
  .use(rateLimiters.auth)
  // Security-sensitive: always audit password changes
  .use(auditLog({ module: "profile", action: "CHANGE_PASSWORD", entityType: "User" }))
  .input(
    z
      .object({
        userId: z.string().min(1),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8).max(100),
        confirmPassword: z.string(),
      })
      .refine((d) => d.newPassword === d.confirmPassword, {
        message: "users.profile.passwordMismatch",
        path: ["confirmPassword"],
      }),
  )
  .mutation(async ({ ctx, input }) => {
    const isSelf = ctx.user.id === input.userId;
    const isAdmin = ctx.user.permissions.includes(Permissions.USERS_UPDATE);

    if (!isSelf && !isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "users.profile.forbidden" });
    }

    if (isSelf && !input.currentPassword) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "users.profile.currentPasswordRequired",
      });
    }

    const authService = getAuthService();
    return authService.changePassword(input.userId, {
      currentPassword: isSelf ? input.currentPassword : undefined,
      newPassword: input.newPassword,
      skipCurrentPasswordCheck: !isSelf && isAdmin,
    });
  });
