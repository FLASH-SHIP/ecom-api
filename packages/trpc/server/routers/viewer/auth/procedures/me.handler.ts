import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";

export const me = authedProcedure.query(async ({ ctx }) => {
  const authService = getAuthService();
  return authService.getUserWithPermissions(ctx.user.id);
});
