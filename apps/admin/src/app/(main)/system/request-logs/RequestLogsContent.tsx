"use client";

import type { BulkAction, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ecom/ui/components/sheet";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Laptop,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash,
  Trash2,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestLog = {
  id: number;
  method: string;
  url: string;
  statusCode: number | null;
  duration: number | null;
  ipAddress: string | null;
  userAgent?: string | null;
  referer?: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email: string } | null;
};

// biome-ignore lint/suspicious/noExplicitAny: generic next-intl translator type
type TranslatorType = any;

// ── HTTP method colour mapping ─────────────────────────────────────────────────

const METHOD_BADGE: Record<string, string> = {
  GET: "border-emerald-200 bg-emerald-100 text-emerald-800",
  POST: "border-blue-200 bg-blue-100 text-blue-800",
  PUT: "border-amber-200 bg-amber-100 text-amber-800",
  PATCH: "border-amber-200 bg-amber-100 text-amber-800",
  DELETE: "border-red-200 bg-red-100 text-red-800",
};

function statusColorClass(code: number | null): string {
  if (code == null) return "text-muted-foreground/50";
  if (code < 300) return "text-emerald-600";
  if (code < 400) return "text-blue-600";
  if (code < 500) return "text-amber-600";
  return "text-red-600";
}

function durationColorClass(ms: number | null): string {
  if (ms == null) return "text-muted-foreground/50";
  if (ms < 200) return "text-emerald-600";
  if (ms < 1000) return "text-amber-600";
  return "text-red-600";
}

// ── User Agent Parser Helpers ─────────────────────────────────────────────────

function detectOS(ua: string | null): string {
  if (!ua) return "Unknown OS";
  const lower = ua.toLowerCase();
  if (lower.includes("windows")) return "Windows";
  if (lower.includes("macintosh") || lower.includes("mac os")) return "macOS";
  if (lower.includes("android")) return "Android";
  if (lower.includes("iphone") || lower.includes("ipad")) return "iOS";
  if (lower.includes("linux")) return "Linux";
  return "Unknown OS";
}

function detectBrowser(ua: string | null): string {
  if (!ua) return "Browser";
  const lower = ua.toLowerCase();
  if (lower.includes("firefox")) return "Firefox";
  if (lower.includes("chrome") && !lower.includes("chromium")) return "Chrome";
  if (lower.includes("safari") && !lower.includes("chrome")) return "Safari";
  if (lower.includes("edge")) return "Edge";
  if (lower.includes("opera") || lower.includes("opr")) return "Opera";
  return "Browser";
}

// ── Map DataTable server params → tRPC input ──────────────────────────────────

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy:
      sort.direction != null
        ? (sort.key as "id" | "createdAt" | "statusCode" | "duration")
        : undefined,
    sortDir: sort.direction != null ? sort.direction : undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RequestLogsContent() {
  const t = useTranslations("requestLogs");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();

  const [detailId, setDetailId] = useState<number | null>(null);

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "request-logs",
    defaultSort: { key: "id", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, refetch } = trpc.viewer.system.requestLogs.useQuery(
    queryInput,
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
  );

  const { data: statsData } = trpc.viewer.system.requestStats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rows: RequestLog[] = ((data?.items ?? []) as unknown[]).map((item) => {
    const i = item as RequestLog & { createdAt: Date | string };
    return { ...i, createdAt: String(i.createdAt) };
  });

  const detailLog = rows.find((r) => r.id === detailId);
  const serverTotalCount = data?.total ?? 0;

  const deleteMut = trpc.viewer.system.deleteRequestLog.useMutation({
    onSuccess: () => {
      utils.viewer.system.requestLogs.invalidate();
      utils.viewer.system.requestStats.invalidate();
      toast(t("deleteSuccess"), "success");
    },
    onError: () => {
      toast(t("deleteError"), "error");
    },
  });

  const purgeMut = trpc.viewer.system.purgeRequestLogs.useMutation({
    onSuccess: (_, variables) => {
      utils.viewer.system.requestLogs.invalidate();
      utils.viewer.system.requestStats.invalidate();
      const days = (variables as { olderThanDays?: number })?.olderThanDays;
      if (days === 0) {
        toast(t("purgeAllSuccess"), "success");
      } else {
        toast(t("purgeSuccess"), "success");
      }
    },
    onError: () => {
      toast(t("purgeError"), "error");
    },
  });

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<RequestLog>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left font-mono text-sm text-muted-foreground hover:text-primary transition-colors focus:outline-none"
            onClick={() => setDetailId(row.original.id)}
          >
            {row.original.id}
          </button>
        ),
      },
      {
        accessorKey: "method",
        header: t("tableColMethod"),
        size: 90,
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-left focus:outline-none"
            onClick={() => setDetailId(row.original.id)}
          >
            <span
              className={cn(
                "inline-block rounded-full border px-2 py-0 text-[0.7rem] font-semibold leading-[20px] transition-opacity hover:opacity-85",
                METHOD_BADGE[row.original.method] ??
                  "border-neutral-200 bg-neutral-100 text-neutral-600",
              )}
            >
              {row.original.method}
            </span>
          </button>
        ),
      },
      {
        accessorKey: "url",
        header: t("tableColUrl"),
        size: 320,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-left truncate font-mono text-xs hover:text-primary transition-colors focus:outline-none max-w-[400px]"
              title={row.original.url}
              onClick={() => setDetailId(row.original.id)}
            >
              {row.original.url}
            </button>
            <button
              type="button"
              className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
              title={t("openUrl")}
              onClick={() => window.open(row.original.url, "_blank", "noopener")}
            >
              <ExternalLink size={12} />
            </button>
          </div>
        ),
      },
      {
        accessorKey: "statusCode",
        header: t("tableColStatus"),
        size: 80,
        cell: ({ row }) => (
          <span className={cn("text-sm font-semibold", statusColorClass(row.original.statusCode))}>
            {row.original.statusCode ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "duration",
        header: t("tableColDuration"),
        size: 100,
        cell: ({ row }) => (
          <span className={cn("text-xs font-medium", durationColorClass(row.original.duration))}>
            {row.original.duration != null ? `${row.original.duration}ms` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: t("tableColIp"),
        size: 130,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.ipAddress ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("tableColTime"),
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "user",
        header: t("tableColUser"),
        size: 140,
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.user?.name ?? row.original.user?.email ?? "—"}
          </span>
        ),
      },
    ],
    [t],
  );

  // ── Filter fields ──────────────────────────────────────────────────────────

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "method",
        label: t("tableColMethod"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
          { value: "PUT", label: "PUT" },
          { value: "PATCH", label: "PATCH" },
          { value: "DELETE", label: "DELETE" },
        ],
      },
      {
        key: "url",
        label: t("tableColUrl"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
          { value: "startsWith", label: "startsWith" },
        ],
      },
      {
        key: "statusRange",
        label: t("tableColStatus"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "2xx", label: "2xx Success" },
          { value: "3xx", label: "3xx Redirect" },
          { value: "4xx", label: "4xx Client Error" },
          { value: "5xx", label: "5xx Server Error" },
        ],
      },
      {
        key: "ipAddress",
        label: t("tableColIp"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
        ],
      },
      {
        key: "createdAt",
        label: t("tableColTime"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "greaterThanOrEqual" },
          { value: "lessThanOrEqual", label: "lessThanOrEqual" },
        ],
      },
    ],
    [t],
  );

  // ── Row actions ─────────────────────────────────────────────────────────────

  const rowActions: RowAction<RequestLog>[] = useMemo(
    () => [
      {
        key: "delete",
        tooltip: t("actions.delete"),
        icon: <Trash size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            title: t("deleteRowTitle"),
            message: t("deleteRowMessage", { id: row.id, method: row.method, url: row.url }),
            confirmLabel: t("actions.deleteConfirm"),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [askConfirm, deleteMut, t],
  );

  // ── Bulk actions ────────────────────────────────────────────────────────────

  const bulkActions: BulkAction<RequestLog>[] = useMemo(
    () => [
      {
        key: "delete",
        label: t("bulkDeleteSelected"),
        variant: "danger",
        onClick: async (selectedRows, clearSelection) => {
          askConfirm({
            title: t("bulkDeleteTitle", { count: selectedRows.length }),
            message: t("bulkDeleteMessage"),
            confirmLabel: t("bulkDeleteConfirm"),
            onConfirm: async () => {
              await Promise.allSettled(
                selectedRows.map((row) => deleteMut.mutateAsync({ id: row.id })),
              );
              utils.viewer.system.requestLogs.invalidate();
              toast(t("bulkDeleteSuccess", { count: selectedRows.length }), "success");
              clearSelection();
            },
          });
        },
      },
    ],
    [askConfirm, deleteMut, utils, toast, t],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {statsData && <RequestLogStatsGrid stats={statsData} t={t} />}

      <DataTable<RequestLog>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
        rowActions={rowActions}
        bulkActions={bulkActions}
        filterFields={filterFields}
        isLoading={isLoading}
        isFetching={isFetching}
        rowCount={serverTotalCount}
        pageTitle={t("title")}
        onServerChange={(params) =>
          onServerChange({
            search: params.search,
            filters: params.filters,
            sort: params.sort,
            page: params.page,
            pageSize: params.pageSize,
          })
        }
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={purgeMut.isPending}
              onClick={() => {
                askConfirm({
                  title: t("purge30Title"),
                  message: t("purge30Message"),
                  confirmLabel: t("actions.deleteConfirm"),
                  onConfirm: () => purgeMut.mutate({ olderThanDays: 30 }),
                });
              }}
            >
              <Trash2 className="mr-2 size-4" />
              {purgeMut.isPending ? t("purging") : t("purge30Days")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={purgeMut.isPending}
              onClick={() => {
                askConfirm({
                  title: t("purgeAllTitle"),
                  message: t("purgeAllMessage"),
                  confirmLabel: t("actions.deleteConfirm"),
                  onConfirm: () => purgeMut.mutate({ olderThanDays: 0 }),
                });
              }}
            >
              <Trash className="mr-2 size-4" />
              {purgeMut.isPending ? t("purging") : t("purgeAll")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 size-4" />
              {t("reload")}
            </Button>
          </div>
        }
        emptyState={
          <div className="py-8 text-center">
            <Search size={48} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="mb-1 text-muted-foreground">{t("noLogsTitle")}</p>
            <p className="text-sm text-muted-foreground/60">{t("noLogsSubtitle")}</p>
          </div>
        }
      />

      <RequestLogDetailSheet
        detailId={detailId}
        onClose={() => setDetailId(null)}
        isLoading={false}
        detailLog={detailLog}
        t={t}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

// ── Presentation Subcomponents ───────────────────────────────────────────────

interface RequestLogStatsGridProps {
  stats: {
    total: number;
    todayCount: number;
    errorCount: number;
    byMethod: { method: string; count: number }[];
  };
  t: TranslatorType;
}

function RequestLogStatsGrid({ stats, t }: RequestLogStatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total Requests Card */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("stats.total")}
            </p>
            <h3 className="mt-1.5 text-3xl font-bold text-foreground tracking-tight">
              {stats.total.toLocaleString()}
            </h3>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-600 border border-blue-500/10">
            <Globe className="size-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
      </div>

      {/* Today Count Card */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("stats.today")}
            </p>
            <h3 className="mt-1.5 text-3xl font-bold text-foreground tracking-tight">
              {stats.todayCount.toLocaleString()}
            </h3>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 border border-emerald-500/10">
            <Activity className="size-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
      </div>

      {/* Error Count Card */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("stats.errors")}
            </p>
            <h3 className="mt-1.5 text-3xl font-bold text-foreground tracking-tight">
              {stats.errorCount.toLocaleString()}
            </h3>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-2.5 text-rose-600 border border-rose-500/10">
            <ShieldAlert className="size-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-rose-500 to-red-500" />
      </div>
    </div>
  );
}

interface RequestLogMetaCardsProps {
  method: string;
  statusCode: number | null;
  duration: number | null;
  t: TranslatorType;
}

function RequestLogMetaCards({ method, statusCode, duration, t }: RequestLogMetaCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
          {t("detail.method")}
        </span>
        <span
          className={cn(
            "mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-relaxed",
            METHOD_BADGE[method] ?? "border-neutral-200 bg-neutral-100 text-neutral-600",
          )}
        >
          {method}
        </span>
      </div>
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
          {t("detail.statusCode")}
        </span>
        <span className={cn("mt-1.5 text-sm font-bold block", statusColorClass(statusCode))}>
          {statusCode ?? "—"}
        </span>
      </div>
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
          {t("detail.duration")}
        </span>
        <span className={cn("mt-1.5 text-sm font-bold block", durationColorClass(duration))}>
          {duration != null ? `${duration}ms` : "—"}
        </span>
      </div>
    </div>
  );
}

interface RequestLogContextGridProps {
  userAgent?: string | null;
  referer?: string | null;
  ipAddress: string | null;
  createdAt: string;
  t: TranslatorType;
}

function RequestLogContextGrid({
  userAgent,
  referer,
  ipAddress,
  createdAt,
  t,
}: RequestLogContextGridProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/5 divide-y divide-border/40 overflow-hidden text-sm">
      {/* User Agent */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <span className="text-muted-foreground font-medium">{t("detail.userAgent")}</span>
        <span className="col-span-2 text-foreground font-medium text-right flex items-center justify-end gap-1.5">
          <Laptop className="size-4 text-muted-foreground/50 shrink-0" />
          <span className="truncate" title={userAgent ?? undefined}>
            {userAgent
              ? `${detectBrowser(userAgent)} • ${detectOS(userAgent)}`
              : t("detail.noUserAgent")}
          </span>
        </span>
      </div>

      {/* Referer */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <span className="text-muted-foreground font-medium">{t("detail.referer")}</span>
        <span
          className="col-span-2 text-foreground font-medium text-right break-all"
          title={referer ?? undefined}
        >
          {referer ? (
            <span className="font-mono text-xs">{referer}</span>
          ) : (
            <span className="text-muted-foreground/40 italic">{t("detail.noReferer")}</span>
          )}
        </span>
      </div>

      {/* Client IP */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <span className="text-muted-foreground font-medium">{t("detail.ipAddress")}</span>
        <span className="col-span-2 text-foreground font-mono text-right font-medium">
          {ipAddress ?? "—"}
        </span>
      </div>

      {/* Timestamp */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <span className="text-muted-foreground font-medium">{t("detail.timestamp")}</span>
        <span className="col-span-2 text-foreground text-right font-medium">
          {formatDateTime(createdAt)}
        </span>
      </div>
    </div>
  );
}

interface RequestLogActorCardProps {
  user: { id: number; name: string | null; email: string } | null;
  t: TranslatorType;
}

function RequestLogActorCard({ user, t }: RequestLogActorCardProps) {
  const hasUser = !!user;
  const userName = user?.name ?? user?.email ?? t("detail.guest");

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
        {t("detail.user")}
      </span>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <User className="size-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{userName}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasUser ? `ID: ${user?.id}` : t("detail.guest")}
          </p>
        </div>
      </div>
    </div>
  );
}

interface RequestLogDetailSheetProps {
  detailId: number | null;
  onClose: () => void;
  isLoading: boolean;
  detailLog: RequestLog | null | undefined;
  t: TranslatorType;
}

function RequestLogDetailSheet({
  detailId,
  onClose,
  isLoading,
  detailLog,
  t,
}: RequestLogDetailSheetProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!detailLog?.url) return;
    try {
      await navigator.clipboard.writeText(detailLog.url);
      setCopied(true);
      toast(t("detail.copySuccess"), "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t("detail.copyError"), "error");
    }
  };

  return (
    <Sheet open={detailId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-l border-border bg-background shadow-xl p-6">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>{t("detail.title")}</span>
            {detailLog?.id && (
              <span className="text-sm font-mono text-muted-foreground/60">#{detailLog.id}</span>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground/75 mt-1">
            {detailLog?.createdAt ? formatDateTime(detailLog.createdAt) : ""}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <RefreshCw className="size-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : detailLog ? (
          <div className="mt-6 space-y-6">
            {/* HTTP Status & Info Cards */}
            <RequestLogMetaCards
              method={detailLog.method}
              statusCode={detailLog.statusCode}
              duration={detailLog.duration}
              t={t}
            />

            {/* URL Section */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                {t("detail.url")}
              </span>
              <div className="relative rounded-lg border border-border bg-muted/30 p-3 pr-12 font-mono text-xs break-all leading-relaxed">
                {detailLog.url}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2.5 top-2.5 p-1.5 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer border border-border/40"
                  title={t("detail.copy")}
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Context Info */}
            <RequestLogContextGrid
              userAgent={detailLog.userAgent}
              referer={detailLog.referer}
              ipAddress={detailLog.ipAddress}
              createdAt={detailLog.createdAt}
              t={t}
            />

            {/* Actor Card */}
            <RequestLogActorCard user={detailLog.user} t={t} />
          </div>
        ) : (
          <div className="mt-8 text-center text-muted-foreground">No details found</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
