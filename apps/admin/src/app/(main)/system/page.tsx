"use client";

import { PageShell } from "@admin/components/layout/PageShell";
import { Card } from "@ecom/ui/components/card";
import { cn } from "@ecom/ui/lib/utils";
import { Database, History, Info, ScrollText, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ModuleCard {
  href: string;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
}

const MODULE_CARD_DEFS: ModuleCard[] = [
  {
    href: "/system/users",
    icon: Users,
    titleKey: "modules.usersTitle",
    descKey: "modules.usersDesc",
  },
  {
    href: "/system/roles",
    icon: Shield,
    titleKey: "modules.rolesTitle",
    descKey: "modules.rolesDesc",
  },
  {
    href: "/system/request-logs",
    icon: ScrollText,
    titleKey: "modules.requestLogsTitle",
    descKey: "modules.requestLogsDesc",
  },
  {
    href: "/system/audit-logs",
    icon: History,
    titleKey: "modules.auditLogsTitle",
    descKey: "modules.auditLogsDesc",
  },
  {
    href: "/system/cache",
    icon: Database,
    titleKey: "modules.cacheTitle",
    descKey: "modules.cacheDesc",
  },
  { href: "/system/info", icon: Info, titleKey: "modules.infoTitle", descKey: "modules.infoDesc" },
];

export default function SystemOverviewPage() {
  const t = useTranslations("system");

  return (
    <PageShell title={t("title")}>
      {/* Module Cards — Botble style: icon left, blue title, grey description */}
      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_CARD_DEFS.map((card, index) => {
            const Icon = card.icon;
            const isLastRow = index >= MODULE_CARD_DEFS.length - (MODULE_CARD_DEFS.length % 3 || 3);
            const isLastCol = (index + 1) % 3 === 0 || index === MODULE_CARD_DEFS.length - 1;

            return (
              <Link
                key={card.href}
                href={card.href}
                className={cn(
                  "flex items-center gap-4 px-6 py-5 no-underline transition-colors hover:bg-accent",
                  !isLastCol && "lg:border-r lg:border-border",
                  !isLastRow && "border-b border-border",
                )}
              >
                {/* Icon circle */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon size={20} />
                </div>

                {/* Text */}
                <div>
                  <p className="text-sm font-semibold leading-tight text-primary">
                    {t(card.titleKey)}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {t(card.descKey)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
}
