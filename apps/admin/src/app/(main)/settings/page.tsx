"use client";

import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { Permissions } from "@ecom/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui/components/card";
import { cn } from "@ecom/ui/lib/utils";
import { BarChart3, Globe, ImageIcon, Phone, Settings } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface SettingCard {
  titleKey: string;
  descKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SETTING_SECTIONS: { groupKey: string; items: SettingCard[] }[] = [
  {
    groupKey: "overview.general",
    items: [
      {
        titleKey: "overview.generalTitle",
        descKey: "overview.generalDesc",
        href: "/settings/general",
        icon: Settings,
      },
      {
        titleKey: "overview.phoneTitle",
        descKey: "overview.phoneDesc",
        href: "/settings/phone",
        icon: Phone,
      },
      {
        titleKey: "overview.mediaTitle",
        descKey: "overview.mediaDesc",
        href: "/settings/media",
        icon: ImageIcon,
      },
      {
        titleKey: "overview.languagesTitle",
        descKey: "overview.languagesDesc",
        href: "/settings/languages",
        icon: Globe,
      },
      {
        titleKey: "overview.trackingTitle",
        descKey: "overview.trackingDesc",
        href: "/settings/tracking",
        icon: BarChart3,
      },
    ],
  },
];

export default function SettingsOverviewPage() {
  const t = useTranslations("settings");

  return (
    <PermissionGuard permissions={[Permissions.SETTINGS_READ]}>
      <div className="flex flex-col gap-4">
        <PageBreadcrumb className="mb-0" />

        {SETTING_SECTIONS.map((section) => (
          <Card key={section.groupKey} className="rounded-lg shadow-none border-border/80">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-base font-semibold">{t(section.groupKey)}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors",
                        "hover:bg-accent/60",
                      )}
                    >
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-primary">{t(item.titleKey)}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                          {t(item.descKey)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGuard>
  );
}
