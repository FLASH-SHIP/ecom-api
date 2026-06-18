"use client";

import type { BulkAction, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime, formatRelativeTime } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecom/ui/components/dialog";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw, Trash, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuditLog = {
  id: number;
  action: string;
  module: string;
  entityId: string | null;
  entityType: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: number; name: string | null; email: string; avatarUrl: string | null } | null;
};

// ── Action colour mapping ──────────────────────────────────────────────────────

const ACTION_BADGE: Record<string, string> = {
  CREATE: "border-emerald-200 bg-emerald-100 text-emerald-800",
  UPDATE: "border-blue-200 bg-blue-100 text-blue-800",
  DELETE: "border-red-200 bg-red-100 text-red-800",
  LOGIN: "border-violet-200 bg-violet-100 text-violet-800",
  LOGOUT: "border-neutral-200 bg-neutral-100 text-neutral-600",
  PURGE: "border-amber-200 bg-amber-100 text-amber-800",
  CLEAR_CACHE: "border-amber-200 bg-amber-100 text-amber-800",
  VIEW: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

function formatActionDescription(
  action: string,
  module: string,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  const mod = module.toLowerCase();
  const key = `actionDesc.${action}` as const;
  const fallback = t("actionDesc.default", { action: action.toLowerCase(), module: mod });
  switch (action) {
    case "LOGIN":
    case "LOGOUT":
    case "CLEAR_CACHE":
      return t(key);
    case "CREATE":
    case "UPDATE":
    case "DELETE":
    case "PURGE":
    case "VIEW":
      return t(key, { module: mod });
    default:
      return fallback;
  }
}

// ── Map DataTable server params → tRPC listAuditLogs input ───────────────────

function toQueryInput(params: DataTableServerParams) {
  const { filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    sortBy: sort.direction != null ? (sort.key as "id" | "createdAt") : undefined,
    sortDir: sort.direction != null ? sort.direction : undefined,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditLogsContent() {
  const t = useTranslations("auditLogs");
  const locale = useLocale();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "audit-logs",
    defaultSort: { key: "id", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, error, refetch } = trpc.viewer.auditLogs.list.useQuery(
    queryInput,
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    },
  );

  const rows = ((data?.items ?? []) as unknown[])
    .filter(
      (item): item is AuditLog =>
        item !== null &&
        typeof item === "object" &&
        "id" in item &&
        typeof (item as { id: unknown }).id === "number" &&
        "action" in item &&
        "module" in item,
    )
    .map((item) => ({
      ...item,
      createdAt: String((item as AuditLog & { createdAt: Date | string }).createdAt),
    }));

  const serverTotalCount = data?.total ?? 0;

  const deleteMut = trpc.viewer.auditLogs.delete.useMutation({
    onSuccess: () => {
      utils.viewer.auditLogs.list.invalidate();
      if (!isBulkRef.current) {
        toast(t("deleteSuccess"), "success");
      }
    },
    onError: () => {
      if (!isBulkRef.current) {
        toast(t("deleteError"), "error");
      }
    },
  });

  const purgeAllMut = trpc.viewer.auditLogs.purgeAll.useMutation({
    onSuccess: () => {
      utils.viewer.auditLogs.list.invalidate();
      toast(t("purgeAllSuccess"), "success");
    },
    onError: () => {
      toast(t("purgeAllError"), "error");
    },
  });

  const isBulkRef = useRef(false);

  // ── Column definitions ─────────────────────────────────────────────────────

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "createdAt",
        header: t("tableColAction"),
        size: 480,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const log = row.original;
          const userName = log.user?.name ?? log.user?.email ?? t("systemUser");
          const initials = userName.charAt(0).toUpperCase();
          const actionDesc = formatActionDescription(log.action, log.module, t);
          const relTime = formatRelativeTime(log.createdAt, locale);

          return (
            <div className="flex items-start gap-3 py-1">
              {log.user?.avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: dynamic avatar URL
                <img
                  src={log.user.avatarUrl}
                  alt={userName}
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold hover:text-primary"
                    onClick={() => setDetailLog(log)}
                  >
                    {userName}
                  </button>
                  <span
                    className={cn(
                      "inline-block rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-[18px]",
                      ACTION_BADGE[log.action] ?? ACTION_BADGE.VIEW,
                    )}
                  >
                    {log.action.toLowerCase()}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {actionDesc}
                  {log.entityType && log.entityId && (
                    <span className="ml-1.5 text-xs text-muted-foreground/50">#{log.entityId}</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/50">{relTime}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "action",
        header: t("tableColActionType"),
        size: 130,
      },
      {
        accessorKey: "module",
        header: t("tableColModule"),
        size: 130,
      },
    ],
    [t, locale],
  );

  // ── Filter fields (Botble-style) ──────────────────────────────────────────

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "action",
        label: t("tableColActionType"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "CREATE", label: "CREATE" },
          { value: "UPDATE", label: "UPDATE" },
          { value: "DELETE", label: "DELETE" },
          { value: "LOGIN", label: "LOGIN" },
          { value: "LOGOUT", label: "LOGOUT" },
          { value: "VIEW", label: "VIEW" },
          { value: "PURGE", label: "PURGE" },
          { value: "CLEAR_CACHE", label: "CLEAR_CACHE" },
        ],
      },
      {
        key: "module",
        label: t("tableColModule"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
        ],
      },
      {
        key: "createdAt",
        label: t("tableColAction"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "greaterThanOrEqual" },
          { value: "lessThanOrEqual", label: "lessThanOrEqual" },
        ],
      },
    ],
    [t],
  );

  // ── Row actions ──────────────────────────────────────────────────────────────

  const rowActions: RowAction<AuditLog>[] = useMemo(
    () => [
      {
        key: "delete",
        tooltip: t("actions.delete"),
        icon: <Trash size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("deleteRowConfirm", { id: String(row.id) }),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [askConfirm, deleteMut, t],
  );

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  const bulkActions: BulkAction<AuditLog>[] = useMemo(
    () => [
      {
        key: "bulkDelete",
        label: t("actions.bulkDelete"),
        variant: "danger",
        onClick: async (selected, clearSelection) => {
          askConfirm({
            message: t("bulkDeleteConfirm", { count: String(selected.length) }),
            onConfirm: async () => {
              isBulkRef.current = true;
              try {
                await Promise.all(selected.map((r) => deleteMut.mutateAsync({ id: r.id })));
                toast(t("bulkDeleteSuccess", { count: String(selected.length) }), "success");
                clearSelection();
              } catch {
                toast(t("bulkDeleteError"), "error");
              } finally {
                isBulkRef.current = false;
              }
            },
          });
        },
      },
    ],
    [askConfirm, deleteMut, toast, t],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {error && <p className="mb-2 text-sm text-destructive">{error.message}</p>}

      <DataTable<AuditLog>
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
        onServerChange={(params) =>
          onServerChange({
            search: params.search,
            filters: params.filters,
            sort: params.sort,
            page: params.page,
            pageSize: params.pageSize,
          })
        }
        rowCount={serverTotalCount}
        pageTitle={t("title")}
        headerActions={
          <div className="flex gap-2">
            <Button
              id="audit-purge-all-btn"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                askConfirm({
                  title: t("purgeAllTitle"),
                  message: t("purgeAllMessage"),
                  confirmLabel: t("purgeAllConfirm"),
                  onConfirm: () => purgeAllMut.mutate(),
                });
              }}
              disabled={purgeAllMut.isPending}
            >
              <Trash2 className="mr-2 size-4" />
              {t("purgeAll")}
            </Button>
            <Button id="audit-reload-btn" variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 size-4" />
              {t("reload")}
            </Button>
          </div>
        }
        emptyState={
          <div className="py-8 text-center">
            <p className="mb-1 text-muted-foreground">{t("noLogsTitle")}</p>
            <p className="text-sm text-muted-foreground/60">{t("noLogsSubtitle")}</p>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("detail.title", { id: detailLog?.id })}</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="flex flex-col gap-3">
              {[
                {
                  label: t("detail.time"),
                  value: formatDateTime(detailLog.createdAt),
                },
                {
                  label: t("detail.user"),
                  value: detailLog.user?.name ?? detailLog.user?.email ?? t("systemUser"),
                },
                {
                  label: t("detail.actionModule"),
                  value: `${detailLog.action} → ${detailLog.module}`,
                },
                ...(detailLog.entityType
                  ? [
                      {
                        label: t("detail.entity"),
                        value: `${detailLog.entityType}#${detailLog.entityId}`,
                      },
                    ]
                  : []),
                ...(detailLog.ipAddress
                  ? [{ label: t("detail.ip"), value: detailLog.ipAddress }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm">{value}</p>
                </div>
              ))}

              {detailLog.oldValues != null && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t("detail.oldValues")}</p>
                  <pre className="m-0 max-h-[200px] overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-[11px]">
                    {JSON.stringify(detailLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {detailLog.newValues != null && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t("detail.newValues")}</p>
                  <pre className="m-0 max-h-[200px] overflow-y-auto rounded-md bg-muted/50 p-3 font-mono text-[11px]">
                    {JSON.stringify(detailLog.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
