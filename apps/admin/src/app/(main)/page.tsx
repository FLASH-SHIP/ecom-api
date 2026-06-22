"use client";

import { trpc } from "@admin/lib/trpc";
import { Badge } from "@ecom/ui/components/badge";
import { Card, CardContent } from "@ecom/ui/components/card";
import { cn } from "@ecom/ui/lib/utils";
import { Activity, Eye, FileText, FolderTree, Mail, MessageCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";

const colorMap = {
  primary: { bg: "bg-primary/10", text: "text-primary", border: "hover:border-primary" },
  secondary: { bg: "bg-violet-500/10", text: "text-violet-500", border: "hover:border-violet-500" },
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "hover:border-emerald-500",
  },
  error: { bg: "bg-destructive/10", text: "text-destructive", border: "hover:border-destructive" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500", border: "hover:border-amber-500" },
  info: { bg: "bg-blue-500/10", text: "text-blue-500", border: "hover:border-blue-500" },
} as const;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { data: postStats } = trpc.viewer.posts.list.useQuery(
    { page: 1, perPage: 1 },
    { retry: false },
  );
  const { data: categoryStats } = trpc.viewer.categories.list.useQuery(undefined, { retry: false });
  const { data: customerStats } = trpc.viewer.customers.stats.useQuery(undefined, { retry: false });
  const { data: auditStats } = trpc.viewer.auditLogs.stats.useQuery(undefined, { retry: false });
  const { data: sysInfo } = trpc.viewer.system.systemInfo.useQuery(undefined, { retry: false });
  const { data: commentCounts } = trpc.viewer.comments.statusCounts.useQuery(undefined, {
    retry: false,
  });
  const { data: contactCounts } = trpc.viewer.contacts.statusCounts.useQuery(undefined, {
    retry: false,
  });

  const totalPosts = postStats?.meta?.total ?? 0;
  const totalCategories = Array.isArray(categoryStats) ? categoryStats.length : 0;
  const totalCustomers = customerStats?.total ?? 0;
  const auditToday = auditStats?.todayCount ?? 0;
  const pendingComments = (commentCounts as Record<string, number> | undefined)?.pending ?? 0;
  const newContacts = (contactCounts as Record<string, number> | undefined)?.new ?? 0;

  const statCards = [
    {
      label: t("statCards.totalPosts"),
      value: totalPosts,
      icon: FileText,
      color: "primary" as const,
    },
    {
      label: t("statCards.categories"),
      value: totalCategories,
      icon: FolderTree,
      color: "warning" as const,
    },
    {
      label: t("statCards.customers"),
      value: totalCustomers,
      icon: Users,
      color: "success" as const,
    },
    {
      label: t("statCards.activityToday"),
      value: auditToday,
      icon: Activity,
      color: "secondary" as const,
    },
    {
      label: t("statCards.pendingComments"),
      value: pendingComments,
      icon: MessageCircle,
      color: "error" as const,
    },
    { label: t("statCards.newContacts"), value: newContacts, icon: Mail, color: "info" as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* System + Member Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Info */}
        {sysInfo && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Activity size={20} className="text-primary" />
                <h3 className="font-semibold">{t("systemOverview")}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label={t("infoCards.nodejs")} value={sysInfo.nodeVersion} />
                <InfoCard label={t("infoCards.environment")} value={sysInfo.env} badge />
                <InfoCard
                  label={t("infoCards.platform")}
                  value={`${sysInfo.platform}/${sysInfo.arch}`}
                />
                <InfoCard
                  label={t("infoCards.memory")}
                  value={
                    sysInfo.memoryUsage?.heapUsed != null
                      ? `${Math.round(sysInfo.memoryUsage.heapUsed / 1024 / 1024)} MB`
                      : "N/A"
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Stats */}
        {customerStats && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users size={20} className="text-primary" />
                <h3 className="font-semibold">{t("customerOverview")}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard
                  label={t("infoCards.active")}
                  value={String(customerStats.active)}
                  variant="success"
                />
                <InfoCard label={t("infoCards.inactive")} value={String(customerStats.inactive)} />
                <InfoCard
                  label={t("infoCards.banned")}
                  value={String(customerStats.banned)}
                  variant="destructive"
                />
                <InfoCard label={t("infoCards.total")} value={String(customerStats.total)} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Audit Overview */}
      {auditStats && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Eye size={20} className="text-primary" />
              <h3 className="font-semibold">{t("auditSummary")}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {t("infoCards.total")}: {auditStats.total.toLocaleString()}
              </Badge>
              <Badge>Today: {auditStats.todayCount}</Badge>
              {auditStats.byModule.slice(0, 6).map((m: { module: string; count: number }) => (
                <Badge key={m.module} variant="outline" className="text-xs">
                  {m.module}: {m.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: keyof typeof colorMap;
}) {
  const c = colorMap[color];
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", c.border)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
          </div>
          <div className={cn("flex items-center justify-center rounded-lg p-2", c.bg, c.text)}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({
  label,
  value,
  badge,
  variant,
}: {
  label: string;
  value: string;
  badge?: boolean;
  variant?: "success" | "destructive";
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {badge ? (
        <Badge variant="secondary" className="mt-1.5">
          {value}
        </Badge>
      ) : (
        <p
          className={cn(
            "mt-1 text-sm font-semibold",
            variant === "success" && "text-emerald-500",
            variant === "destructive" && "text-destructive",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}
