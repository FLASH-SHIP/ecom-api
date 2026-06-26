"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Construction } from "lucide-react";
import { useTranslations } from "next-intl";

export default function MediaSettingsPage() {
  const t = useTranslations("settings");

  return (
    <PermissionGuard permissions={[Permissions.SETTINGS_READ]}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-bold">{t("overview.mediaTitle")}</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Construction className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("overview.mediaDesc")}</p>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
