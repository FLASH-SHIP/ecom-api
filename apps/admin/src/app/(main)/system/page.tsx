"use client";

import { PageShell } from "@admin/components/layout/PageShell";
import { trpc } from "@admin/lib/trpc";
import { Card } from "@ecom/ui/components/card";
import { cn } from "@ecom/ui/lib/utils";
import { Activity, Database, History, Info, ScrollText, Shield, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ModuleCard {
  href: string;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function SystemOverviewPage() {
  const t = useTranslations("system");

  const { refetch: fetchQueueUrl } = trpc.viewer.system.getQueueDashboardUrl.useQuery(undefined, {
    enabled: false,
  });

  const handleQueueClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const result = await fetchQueueUrl();
      if (result.data?.url) {
        window.open(result.data.url, "_blank");
      }
    } catch (err) {
      console.error("Failed to fetch queue dashboard URL", err);
    }
  };

  const cards: ModuleCard[] = [
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
    {
      href: "/system/info",
      icon: Info,
      titleKey: "modules.infoTitle",
      descKey: "modules.infoDesc",
    },
    {
      href: "#",
      icon: Activity,
      titleKey: "modules.queuesTitle",
      descKey: "modules.queuesDesc",
      onClick: handleQueueClick,
    },
  ];

  return (
    <PageShell title={t("title")}>
      {/* Module Cards — Botble style: icon left, blue title, grey description */}
      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => {
            const Icon = card.icon;
            const isLastRow = index >= cards.length - (cards.length % 3 || 3);
            const isLastCol = (index + 1) % 3 === 0 || index === cards.length - 1;

            const content = (
              <>
                {/* Icon circle */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon size={20} />
                </div>

                {/* Text */}
                <div className="text-left">
                  <p className="text-sm font-semibold leading-tight text-primary">
                    {t(card.titleKey)}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {t(card.descKey)}
                  </p>
                </div>
              </>
            );

            const className = cn(
              "flex items-center gap-4 px-6 py-5 no-underline transition-colors hover:bg-accent cursor-pointer",
              !isLastCol && "lg:border-r lg:border-border",
              !isLastRow && "border-b border-border",
            );

            if (card.onClick) {
              return (
                <button
                  type="button"
                  key={card.titleKey}
                  onClick={card.onClick}
                  className={cn(className, "border-none bg-transparent w-full text-left")}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={card.href} href={card.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
}
