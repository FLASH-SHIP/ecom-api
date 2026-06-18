"use client";

import { Card, CardContent } from "@ecom/ui/components/card";
import { Construction } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TrackingSettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold">{t("overview.trackingTitle")}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16">
          <Construction className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("overview.trackingDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
