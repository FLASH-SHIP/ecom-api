"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { Permissions } from "@ecom/lib/permissions";
import { useTranslations } from "next-intl";
import { PushSettingsTab } from "../../notifications/components/PushSettingsTab";

export default function PushSettingsPage() {
  const t = useTranslations("settings");

  return (
    <PermissionGuard permissions={[Permissions.NOTIFICATIONS_SETTINGS_READ]} mode="page">
      <div className="flex flex-col gap-6">
        <PageBreadcrumb className="mb-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold">{t("overview.pushSettingsTitle")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("overview.pushSettingsDesc")}</p>
          </div>
        </div>
        <PushSettingsTab />
      </div>
    </PermissionGuard>
  );
}
