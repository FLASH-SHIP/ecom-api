import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { getMediaFileService } from "@ecom/features/di/containers/MediaService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure } from "@ecom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const updateProfile = authedProcedure
  .use(auditLog({ module: "profile", action: "UPDATE", entityType: "User" }))
  .input(
    z.object({
      /** Target user ID. Defaults to the logged-in user. Admins may pass another userId. */
      userId: z.number().int().positive().optional(),
      name: z
        .string()
        .min(1, "Tên không được để trống")
        .max(100)
        .transform((s) => s.trim())
        .refine((s) => s.length > 0, "Tên không được chỉ có khoảng trắng")
        .optional(),
      username: z
        .string()
        .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
        .max(50)
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          "Tên đăng nhập chỉ được dùng chữ cái, số, gạch dưới (_) và gạch ngang (-)",
        )
        .optional(),
      phone: z
        .string()
        .max(20)
        .regex(/^\+?[0-9\s\-().]{7,20}$/, "Số điện thoại không hợp lệ")
        .nullable()
        .optional(),
      avatarUrl: z.string().url().nullable().optional(),
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
        message: "Không có quyền chỉnh sửa người dùng này",
      });
    }

    const authService = getAuthService();
    return authService.updateProfile(effectiveUserId, data, (oldUrl) =>
      getMediaFileService().deleteByUrl(oldUrl),
    );
  });
