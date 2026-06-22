"use client";

import type { BulkActionConfig, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import Error403Page from "@admin/components/errors/Error403Page";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, AtSign, Eye, Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { CustomerDetailDrawer } from "./components/CustomerDetailDrawer";
import { CustomerFormDrawer } from "./components/CustomerFormDrawer";

type CustomerRow = {
  id: number;
  email: string;
  username: string;
  name: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
};

const STATUS_BADGE_CONFIG: Record<string, string> = {
  ACTIVE: "bg-emerald-500 text-white",
  INACTIVE: "bg-neutral-400 text-white",
  BANNED: "bg-red-500 text-white",
};

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    perPage: pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy: sort.direction ? (sort.key as "id" | "email" | "createdAt" | "status") : undefined,
    sortDir: sort.direction ?? undefined,
  };
}

export default function CustomersContent() {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("users");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isBulkRef = useRef(false);

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "customers",
    defaultSort: { key: "id", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const {
    data,
    isLoading,
    isFetching,
    error: listError,
    refetch,
  } = trpc.viewer.customers.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    retry: false,
  });

  const deleteMut = trpc.viewer.customers.remove.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      if (!isBulkRef.current) {
        toast(tCommon("success") ?? "Deleted successfully", "success");
      }
    },
    onError: (err) => {
      if (!isBulkRef.current) {
        toast(err.message, "error");
      }
    },
  });

  const rows = (data?.items ?? []) as CustomerRow[];
  const serverTotalCount = data?.total ?? 0;

  // ── Column definitions ────────────────────────────────────────────────
  const columns: ColumnDef<CustomerRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: t("fields.name"),
        size: 250,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {(m.name ?? m.email).charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary"
                onClick={() => setSelectedId(m.id)}
              >
                {m.name || "—"}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "username",
        header: tUsers("fields.username"),
        size: 150,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <AtSign className="h-3 w-3" />
            {row.original.username}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: t("fields.email"),
        size: 200,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        size: 130,
        cell: ({ row }) => {
          const status = row.original.status;
          const colorClass = STATUS_BADGE_CONFIG[status] ?? "bg-neutral-400 text-white";
          return (
            <span
              className={cn(
                "inline-block min-w-[80px] rounded-full px-3 py-0.5 text-center text-xs font-semibold",
                colorClass,
              )}
            >
              {t(`status.${status}`)}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("detail.customerSince"),
        size: 150,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t, tUsers],
  );

  // ── Filter fields ──────────────────────────────────────────────────────
  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        type: "number",
        operators: [
          { value: "equals", label: "equals" },
          { value: "greaterThan", label: "greaterThan" },
          { value: "lessThan", label: "lessThan" },
        ],
      },
      {
        key: "email",
        label: t("fields.email"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
        ],
      },
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "ACTIVE", label: t("status.ACTIVE") },
          { value: "INACTIVE", label: t("status.INACTIVE") },
          { value: "BANNED", label: t("status.BANNED") },
        ],
      },
      {
        key: "createdAt",
        label: t("detail.customerSince"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "greaterThanOrEqual" },
          { value: "lessThanOrEqual", label: "lessThanOrEqual" },
        ],
      },
    ],
    [t],
  );

  // ── Row actions ────────────────────────────────────────────────────────
  const rowActions: RowAction<CustomerRow>[] = useMemo(
    () => [
      {
        key: "view",
        tooltip: t("detail.title"),
        icon: <Eye size={16} />,
        color: "primary",
        onClick: (row) => setSelectedId(row.id),
      },
      {
        key: "delete",
        tooltip: tCommon("delete"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("detail.deleteConfirm"),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [t, tCommon, askConfirm, deleteMut],
  );

  // ── Bulk actions ───────────────────────────────────────────────────────
  const bulkActionConfig: BulkActionConfig<CustomerRow> = useMemo(
    () => ({
      onBulkDelete: (selected, clearSelection) => {
        askConfirm({
          message: t("detail.deleteConfirm"),
          onConfirm: async () => {
            isBulkRef.current = true;
            try {
              await Promise.all(selected.map((r) => deleteMut.mutateAsync({ id: r.id })));
              toast(tCommon("success") ?? "Deleted", "success");
              clearSelection();
            } catch {
              toast(tCommon("error") ?? "Error occurred", "error");
            } finally {
              isBulkRef.current = false;
            }
          },
        });
      },
    }),
    [deleteMut, t, tCommon, askConfirm, toast],
  );

  if (listError?.data?.code === "FORBIDDEN") {
    return <Error403Page />;
  }

  return (
    <>
      {listError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {listError.data?.code === "UNAUTHORIZED" ? t("unauthorized") : listError.message}
        </div>
      )}

      <DataTable<CustomerRow>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
        rowActions={rowActions}
        bulkActionConfig={bulkActionConfig}
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
        onRefresh={() => refetch()}
        headerActions={
          <Button id="create-customer" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t("addCustomer")}
          </Button>
        }
        emptyState={
          <div className="py-8 text-center">
            <Users size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">{t("noCustomersTitle")}</p>
            <p className="mb-4 text-sm text-muted-foreground/60">{t("noCustomersSubtitle")}</p>
            <Button id="create-customer-empty" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              {t("addCustomer")}
            </Button>
          </div>
        }
      />

      <CustomerFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => setCreateOpen(false)}
      />

      <CustomerDetailDrawer
        customerId={selectedId}
        onClose={() => setSelectedId(null)}
        onDeleted={() => setSelectedId(null)}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
