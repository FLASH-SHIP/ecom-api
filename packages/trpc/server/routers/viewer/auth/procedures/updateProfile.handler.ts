import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { getMediaFileService } from "@ecom/features/di/containers/MediaService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { rateLimiters } from "@flash-ship/ecom-trpc/server/middleware/rateLimit";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const updateProfile = authedProcedure
  .use(auditLog({ module: "profile", action: "UPDATE", entityType: "User" }))
  .use(rateLimiters.mutation)
  .input(
    z.object({
      /** Target user ID. Defaults to the logged-in user. Admins may pass another userId. */
      userId: z.string().min(1).optional(),
      name: z
        .string()
        .min(1, "users.profile.nameRequired")
        .max(100)
        .transform((s) => s.trim())
        .refine((s) => s.length > 0, "users.profile.nameWhitespace")
        .optional(),
      username: z
        .string()
        .min(3, "users.profile.usernameMin")
        .max(50)
        .regex(/^[a-zA-Z0-9_.-]+$/, "users.profile.usernameInvalid")
        .optional(),
      phone: z
        .string()
        .max(20)
        .regex(/^\+?[0-9\s\-().]{7,20}$/, "users.profile.phoneInvalid")
        .nullable()
        .optional(),
      avatarUrl: z.string().max(2048).nullable().optional(),
      locale: z.enum(["en", "vi"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { userId: targetId, ...data } = input;
    const effectiveUserId = targetId ?? ctx.user.id;

    // Only allow editing another user's profile if admin
    const isSelf = effectiveUserId === ctx.user.id;
    const isAdmin = ctx.user.permissions.includes(Permissions.USERS_UPDATE);

    if (!isSelf && !isAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "users.profile.forbiddenUpdate",
      });
    }

    const authService = getAuthService();
    return authService.updateProfile(effectiveUserId, data, (oldUrl) =>
      getMediaFileService().deleteByUrl(oldUrl),
    );
  });
