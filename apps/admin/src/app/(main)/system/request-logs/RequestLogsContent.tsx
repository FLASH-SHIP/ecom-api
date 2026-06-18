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
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, RefreshCw, Search, Trash, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestLog = {
  id: number;
  method: string;
  url: string;
  statusCode: number | null;
  duration: number | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email: string } | null;
};

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

  const rows: RequestLog[] = ((data?.items ?? []) as unknown[]).map((item) => {
    const i = item as RequestLog & { createdAt: Date | string };
    return { ...i, createdAt: String(i.createdAt) };
  });

  const serverTotalCount = data?.total ?? 0;

  const deleteMut = trpc.viewer.system.deleteRequestLog.useMutation({
    onSuccess: () => {
      utils.viewer.system.requestLogs.invalidate();
      toast(t("deleteSuccess"), "success");
    },
    onError: () => {
      toast(t("deleteError"), "error");
    },
  });

  const purgeMut = trpc.viewer.system.purgeRequestLogs.useMutation({
    onSuccess: () => {
      utils.viewer.system.requestLogs.invalidate();
      utils.viewer.system.requestStats.invalidate();
      toast(t("purgeSuccess"), "success");
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
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "method",
        header: t("tableColMethod"),
        size: 90,
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-block rounded-full border px-2 py-0 text-[0.7rem] font-semibold leading-[20px]",
              METHOD_BADGE[row.original.method] ??
                "border-neutral-200 bg-neutral-100 text-neutral-600",
            )}
          >
            {row.original.method}
          </span>
        ),
      },
      {
        accessorKey: "url",
        header: t("tableColUrl"),
        size: 320,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-1">
            <span className="max-w-[400px] truncate font-mono text-xs" title={row.original.url}>
              {row.original.url}
            </span>
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

  // ── Filter fields (Botble-style) ──────────────────────────────────────────

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
    <>
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
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
