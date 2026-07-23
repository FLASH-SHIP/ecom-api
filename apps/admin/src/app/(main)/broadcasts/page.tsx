"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { useTranslations } from "next-intl";
import { BroadcastTab } from "../notifications/components/BroadcastTab";

export default function BroadcastPage() {
  const t = useTranslations("notifications");

  return (
    <PermissionGuard permissions={[Permissions.NOTIFICATIONS_BROADCAST_READ]} mode="page">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold">{t("broadcast")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("description")}</p>
          </div>
        </div>
        <div className="flex-1 animate-fade-in">
          <BroadcastTab />
        </div>
      </div>
    </PermissionGuard>
  );
}
