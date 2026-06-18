"use client";

import { PageShell } from "@admin/components/layout/PageShell";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Skeleton } from "@ecom/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ecom/ui/components/tooltip";
import { FolderCog, Loader2, Lock, RefreshCcw, RotateCcw, Settings, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ClearNamespace = "all" | "settings" | "category" | "permissions" | "ratelimit";

interface CacheRow {
  namespace: ClearNamespace;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  confirmMsgKey: string;
  confirmTitleKey?: string;
  confirmColor?: "error" | "warning";
}

// ─── Cache row definitions ────────────────────────────────────────────────────

const CACHE_ROWS: CacheRow[] = [
  {
    namespace: "settings",
    icon: Settings,
    titleKey: "settingsCache",
    descKey: "settingsCacheDesc",
    confirmMsgKey: "confirmSettingsMsg",
  },
  {
    namespace: "category",
    icon: FolderCog,
    titleKey: "categoryCache",
    descKey: "categoryCacheDesc",
    confirmMsgKey: "confirmCategoryMsg",
  },
  {
    namespace: "permissions",
    icon: Lock,
    titleKey: "permissionsCache",
    descKey: "permissionsCacheDesc",
    confirmMsgKey: "confirmPermissionsMsg",
  },
  {
    namespace: "ratelimit",
    icon: Shield,
    titleKey: "rateLimitCache",
    descKey: "rateLimitCacheDesc",
    confirmMsgKey: "confirmRateLimitMsg",
    confirmTitleKey: "confirmResetTitle",
    confirmColor: "warning",
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CacheManagementPage() {
  const t = useTranslations("cache");
  const [clearing, setClearing] = useState<ClearNamespace | null>(null);
  // Track dialog confirm color separately to avoid fragile message-string matching
  const [pendingColor, setPendingColor] = useState<"error" | "warning">("error");

  const { toast } = useToast();
  const { askConfirm, dialogProps } = useConfirm();
  const utils = trpc.useUtils();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = trpc.viewer.system.cacheStats.useQuery(undefined, {
    // Poll every 30s so stats stay reasonably fresh without hammering Redis
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const clearMut = trpc.viewer.system.clearCache.useMutation({
    onSuccess: (result) => {
      if (result.cleared > 0) {
        toast(t("clearedSuccess", { count: result.cleared }), "success");
      } else {
        toast(t("clearedSuccessEmpty"), "success");
      }
      setClearing(null);
      utils.viewer.system.cacheStats.invalidate();
    },
    onError: (err) => {
      toast(err.message, "error");
      setClearing(null);
    },
  });

  function handleClear(row: CacheRow) {
    setPendingColor(row.confirmColor ?? "error");
    askConfirm({
      title: t(row.confirmTitleKey ?? "confirmTitle"),
      message: t(row.confirmMsgKey),
      confirmLabel: t("confirmLabel"),
      cancelLabel: t("cancelLabel"),
      onConfirm: () => {
        setClearing(row.namespace);
        clearMut.mutate({ namespace: row.namespace });
      },
    });
  }

  function handleClearAll() {
    setPendingColor("error");
    askConfirm({
      title: t("confirmTitle"),
      message: `${t("confirmClearAll")}\n${t("clearAllWarning")}`,
      confirmLabel: t("confirmLabelAll"),
      cancelLabel: t("cancelLabel"),
      onConfirm: () => {
        setClearing("all");
        clearMut.mutate({ namespace: "all" });
      },
    });
  }

  const byNs = stats?.namespaces.byNamespace ?? {};

  return (
    <PageShell title={t("title")}>
      {/* Single ConfirmDialog instance — controlled by useConfirm */}
      <ConfirmDialog {...dialogProps} confirmColor={pendingColor} />

      <div className="flex flex-col gap-6">
        {/* ── Section 1: Cache rows ────────────────────────────────── */}
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-3">
            <div className="flex items-center gap-2">
              <RotateCcw size={18} className="text-muted-foreground" />
              <p className="text-sm font-semibold">{t("sectionManage")}</p>
              <span className="text-xs text-muted-foreground">— {t("subtitle")}</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="cache-clear-all-btn"
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={handleClearAll}
                    disabled={clearing !== null}
                  >
                    {clearing === "all" ? (
                      <Loader2 className="mr-2 size-3 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-2 size-3" />
                    )}
                    {clearing === "all" ? t("clearing") : t("clearAll")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("clearAllDesc")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-12 px-4 py-3" />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("typeLabel")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("descLabel")}
                  </th>
                  <th className="w-28 px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("keysLabel")}
                  </th>
                  <th className="w-28 px-4 py-3 text-right font-medium text-muted-foreground">
                    {t("actionLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CACHE_ROWS.map((row) => {
                  const isBusy = clearing === row.namespace;
                  const keyCount = byNs[row.namespace] ?? 0;
                  const Icon = row.icon;

                  return (
                    <tr
                      key={row.namespace}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      {/* Icon circle */}
                      <td className="px-4 py-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Icon size={16} />
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-primary">{t(row.titleKey)}</span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t(row.descKey)}</td>

                      {/* Redis key count */}
                      <td className="px-4 py-3">
                        {statsLoading ? (
                          <Skeleton className="h-6 w-12" />
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            {keyCount} keys
                          </Badge>
                        )}
                      </td>

                      {/* Action button */}
                      <td className="px-4 py-3 text-right">
                        <Button
                          id={`cache-clear-${row.namespace}-btn`}
                          size="sm"
                          variant={row.confirmColor === "warning" ? "outline" : "destructive"}
                          onClick={() => handleClear(row)}
                          disabled={clearing !== null}
                        >
                          {isBusy && <Loader2 className="mr-2 size-3 animate-spin" />}
                          {isBusy ? t("clearing") : t("clearBtn")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-6 py-3">
            <p className="text-xs text-muted-foreground">{t("footerHint")}</p>
          </div>
        </Card>

        {/* ── Section 2: Redis Stats ───────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-6 py-3">
            <p className="text-sm font-semibold">{t("sectionRedis")}</p>
          </div>

          {statsError ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {t("redisNoData")}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
              {(
                [
                  { label: t("redisMemory"), value: stats?.redis.memoryUsed ?? "—" },
                  { label: t("redisVersion"), value: stats?.redis.version ?? "—" },
                  {
                    label: t("redisUptime"),
                    value: stats ? formatUptime(stats.redis.uptimeSeconds) : "—",
                  },
                  { label: t("redisClients"), value: stats?.redis.connectedClients ?? "—" },
                  {
                    label: t("redisHitRate"),
                    value: stats?.redis.hitRate != null ? `${stats.redis.hitRate}%` : "—",
                  },
                  { label: "Rate limit keys", value: stats?.namespaces.rateLimit ?? "—" },
                ] as Array<{ label: string; value: string | number }>
              ).map((stat) => (
                <div
                  key={stat.label}
                  className="border-b border-r border-border px-6 py-4 last:border-r-0"
                >
                  <p className="mb-1 text-xs text-muted-foreground">{stat.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-5 w-[60px]" />
                  ) : (
                    <p className="text-sm font-bold">{stat.value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
