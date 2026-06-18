"use client";

import { signOut, useSession } from "next-auth/react";
import { useMemo } from "react";
import type { User } from "./user";

type UseUserReturn = {
  data: User | null;
  isGuest: boolean;
  signOut: () => Promise<void>;
};

/**
 * useUser hook for @ecom/shared.
 *
 * Reads user data from NextAuth session (`session.db`).
 * The `db` field is populated by NextAuth session callback in apps/admin.
 * Guest = user with no role or empty role array.
 */
function useUser(): UseUserReturn {
  const { data } = useSession();
  const user = useMemo(() => (data?.db as User | null) ?? null, [data]);
  const isGuest = useMemo(
    () => !user?.role || (Array.isArray(user?.role) && user.role.length === 0),
    [user],
  );

  async function handleSignOut() {
    return signOut();
  }

  return {
    data: user,
    isGuest,
    signOut: handleSignOut,
  };
}

export default useUser;
