"use client";

import useUser from "@ecom/shared/@auth/useUser";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import Error403Page from "../errors/Error403Page";

interface PermissionGuardProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
  mode?: "page" | "section";
}

export function useRequirePermission(permissions: string[]): {
  isLoading: boolean;
  hasPermission: boolean;
} {
  const { data: user, isGuest } = useUser();

  // If user session is still loading
  const isLoading = user === null && !isGuest;

  if (isGuest || !user) {
    return { isLoading, hasPermission: false };
  }

  const userPerms = user.permissions ?? [];
  const hasWildcard = userPerms.includes("*");

  if (hasWildcard) {
    return { isLoading, hasPermission: true };
  }

  const hasPermission = permissions.every((perm) => userPerms.includes(perm));
  return { isLoading, hasPermission };
}

export function PermissionGuard({
  permissions,
  children,
  fallback,
  mode = "section",
}: PermissionGuardProps) {
  const { isLoading, hasPermission } = useRequirePermission(permissions);
  const t = useTranslations("errors");

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    if (mode === "page") {
      return <Error403Page />;
    }

    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950/20">
        <AlertCircle className="size-4 shrink-0" />
        {t("FORBIDDEN")}
      </div>
    );
  }

  return <>{children}</>;
}
