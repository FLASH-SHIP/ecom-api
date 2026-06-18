"use client";

import { PageShell } from "@admin/components/layout/PageShell";
import { trpc } from "@admin/lib/trpc";
import { Badge } from "@ecom/ui/components/badge";
import { Card } from "@ecom/ui/components/card";
import { Skeleton } from "@ecom/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import {
  AlertCircle,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  MonitorCheck,
  Timer,
} from "lucide-react";
import { useTranslations } from "next-intl";

// ── Formatters ───────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUptime(seconds: number, t: (key: string) => string) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} ${t("days")}`);
  if (h > 0) parts.push(`${h} ${t("hours")}`);
  parts.push(`${m} ${t("minutes")}`);
  return parts.join(" ");
}

function formatLoadAvg(val: number) {
  return val.toFixed(2);
}

// ── Sub-components ───────────────────────────────────────────────────

interface InfoRow {
  label: string;
  value: string;
  chip?: { label: string; color: "success" | "info" | "warning" | "error" | "default" };
  tooltip?: string;
}

interface InfoSection {
  title: string;
  icon: React.ElementType;
  rows: InfoRow[];
}

const chipColors: Record<string, string> = {
  success: "border-emerald-500 text-emerald-600 dark:text-emerald-400",
  warning: "border-amber-500 text-amber-600 dark:text-amber-400",
  error: "border-destructive text-destructive",
  info: "border-blue-500 text-blue-600 dark:text-blue-400",
  default: "",
};

function SectionCard({ section }: { section: InfoSection }) {
  const Icon = section.icon;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-3">
        <Icon size={18} className="text-muted-foreground" />
        <p className="text-sm font-semibold">{section.title}</p>
      </div>
      <div>
        {section.rows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-5 py-3",
              i < section.rows.length - 1 && "border-b border-border",
            )}
          >
            <p className="min-w-[160px] text-sm text-muted-foreground">{row.label}</p>
            <div className="flex items-center gap-2">
              {row.chip && (
                <Badge variant="outline" className={cn("text-xs", chipColors[row.chip.color])}>
                  {row.chip.label}
                </Badge>
              )}
              {row.tooltip ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-mono text-sm font-medium">{row.value}</span>
                    </TooltipTrigger>
                    <TooltipContent side="left">{row.tooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="font-mono text-sm font-medium">{row.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function UsageBar({
  label,
  used,
  total,
  warnAt = 0.75,
  formatValue = formatBytes,
}: {
  label: string;
  used: number;
  total: number;
  warnAt?: number;
  formatValue?: (n: number) => string;
}) {
  const pct = Math.min(used / total, 1);
  const isWarn = pct > warnAt;
  const color = pct > 0.9 ? "bg-destructive" : isWarn ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div>
      <div className="mb-1.5 flex justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {formatValue(used)} / {formatValue(total)} ({Math.round(pct * 100)}%)
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/50 px-5 py-3">
        <Skeleton className="h-5 w-[180px]" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
        <div key={i} className="border-b border-border px-5 py-3">
          <Skeleton className="h-5" />
        </div>
      ))}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: large data mapping with optional fields for all system metrics
export default function SystemInfoPage() {
  const t = useTranslations("systemInfo");
  const { data, isLoading, isError } = trpc.viewer.system.systemInfo.useQuery(undefined, {
    staleTime: 30_000,
  });

  if (isError) {
    return (
      <div className="py-8 text-center">
        <Badge variant="destructive" className="gap-2">
          <AlertCircle size={14} />
          {t("loadError")}
        </Badge>
      </div>
    );
  }

  const sections: InfoSection[] = data
    ? [
        // ── Môi trường & Runtime ──────────────────────
        {
          title: t("envRuntime"),
          icon: MonitorCheck,
          rows: [
            {
              label: t("environment"),
              value: data.env,
              chip: {
                label: data.env === "production" ? "Production" : "Development",
                color: data.env === "production" ? "success" : "warning",
              },
            },
            { label: "Node.js", value: data.nodeVersion },
            { label: t("platform"), value: `${data.platform} / ${data.arch}` },
            { label: "Hostname", value: data.hostname },
            { label: "Timezone", value: data.timezone },
            ...(data.osRelease ? [{ label: t("os"), value: data.osRelease }] : []),
          ],
        },

        // ── CPU & Load ────────────────────────────────
        {
          title: t("cpuLoad"),
          icon: Cpu,
          rows: [
            { label: "CPU Model", value: data.system.cpuModel },
            { label: t("cpuCores"), value: `${data.system.cpuCores} cores` },
            {
              label: "Load average (1m)",
              value: formatLoadAvg(data.system.loadAvg[0]),
              chip: {
                label:
                  data.system.loadAvg[0] > data.system.cpuCores * 0.8
                    ? t("loadHigh")
                    : data.system.loadAvg[0] > data.system.cpuCores * 0.5
                      ? t("loadMedium")
                      : t("loadNormal"),
                color:
                  data.system.loadAvg[0] > data.system.cpuCores * 0.8
                    ? "error"
                    : data.system.loadAvg[0] > data.system.cpuCores * 0.5
                      ? "warning"
                      : "success",
              },
              tooltip: `5m: ${formatLoadAvg(data.system.loadAvg[1])} — 15m: ${formatLoadAvg(data.system.loadAvg[2])}`,
            },
            {
              label: "Load avg (5m / 15m)",
              value: `${formatLoadAvg(data.system.loadAvg[1])} / ${formatLoadAvg(data.system.loadAvg[2])}`,
            },
          ],
        },

        // ── Uptime ───────────────────────────────────
        {
          title: t("uptime"),
          icon: Timer,
          rows: [
            { label: "Node.js process", value: formatUptime(data.processUptime, t) },
            { label: t("systemOS"), value: formatUptime(data.systemUptime, t) },
          ],
        },

        // ── Database & Cache ──────────────────────────
        {
          title: t("dbCache"),
          icon: Database,
          rows: [
            {
              label: "PostgreSQL",
              value: data.database.latencyMs !== null ? `${data.database.latencyMs}ms` : "N/A",
              chip: {
                label: data.database.ok ? "Connected" : t("connectionError"),
                color: data.database.ok ? "success" : "error",
              },
            },
            {
              label: "Redis",
              value: data.redis.latencyMs !== null ? `${data.redis.latencyMs}ms` : "N/A",
              chip: {
                label: data.redis.ok ? "Connected" : t("connectionError"),
                color: data.redis.ok ? "success" : "error",
              },
              ...(data.redis.usedMemory
                ? { tooltip: `Memory used: ${data.redis.usedMemory}` }
                : {}),
            },
          ],
        },
      ]
    : [];

  return (
    <PageShell title={t("title")}>
      {/* Skeleton */}
      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Info sections grid */}
      {data && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {sections.map((s) => (
              <SectionCard key={s.title} section={s} />
            ))}
          </div>

          {/* Usage bars — full width */}
          <Card className="mt-6 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-3">
              <HardDrive size={18} className="text-muted-foreground" />
              <p className="text-sm font-semibold">{t("resources")}</p>
            </div>
            <div className="flex flex-col gap-6 p-6">
              {/* System RAM */}
              <UsageBar
                label={t("systemRam")}
                used={data.system.totalMem - data.system.freeMem}
                total={data.system.totalMem}
              />

              {/* Node Heap */}
              <UsageBar
                label="Node.js Heap"
                used={data.memoryUsage.heapUsed}
                total={data.memoryUsage.heapTotal}
              />

              {/* Disk */}
              {data.disk && (
                <UsageBar
                  label={t("diskLabel", { mount: data.disk.mountpoint })}
                  used={data.disk.used}
                  total={data.disk.free + data.disk.used}
                />
              )}
            </div>
          </Card>

          {/* Node memory details */}
          <Card className="mt-6 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-3">
              <MemoryStick size={18} className="text-muted-foreground" />
              <p className="text-sm font-semibold">{t("memoryDetails")}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5">
              {[
                { label: "RAM Total", value: formatBytes(data.system.totalMem) },
                { label: "RAM Free", value: formatBytes(data.system.freeMem) },
                { label: "Heap Used", value: formatBytes(data.memoryUsage.heapUsed) },
                { label: "Heap Total", value: formatBytes(data.memoryUsage.heapTotal) },
                { label: "RSS", value: formatBytes(data.memoryUsage.rss) },
                ...(data.disk
                  ? [
                      { label: "Disk Total", value: formatBytes(data.disk.total) },
                      { label: "Disk Used", value: formatBytes(data.disk.used) },
                      { label: "Disk Free", value: formatBytes(data.disk.free) },
                    ]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="border-b border-r border-border px-5 py-3.5 last:border-r-0"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}
