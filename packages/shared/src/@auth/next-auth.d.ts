import type { DefaultSession } from "next-auth";
import type { User } from "./user";

/**
 * Augment NextAuth Session to include `db` field.
 * This is required by the app's useUser hook which reads `session.db`.
 *
 * The `db` field is populated in `apps/admin/auth.ts` session callback
 * by fetching the user from tRPC/Prisma.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    db: User | null;
    accessToken?: string;
  }
}
