"use client";

import type { BulkActionConfig, RowAction } from "@admin/components/data-table";
import { DataTable } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams } from "@admin/components/data-table/types";
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
import { AlertCircle, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { GroupFormDrawer } from "./components/GroupFormDrawer";

type GroupRow = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  createdAt: string;
  _count: {
    customers: number;
  };
};

function toQueryInput(params: DataTableServerParams) {
  const { search, page, pageSize, sort } = params;

  return {
    page,
    perPage: pageSize,
    search: search.trim() || undefined,
    sortBy: sort.direction != null ? sort.key : undefined,
    sortDir: sort.direction != null ? (sort.direction as "asc" | "desc") : undefined,
  };
}

export default function GroupsContent() {
  const t = useTranslations("customer-groups");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const isBulkRef = useRef(false);

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "customer-groups",
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
  } = trpc.viewer.customerGroups.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    retry: false,
  });

  const deleteMut = trpc.viewer.customerGroups.remove.useMutation({
    onSuccess: () => {
      utils.viewer.customerGroups.list.invalidate();
      if (!isBulkRef.current) {
        toast(t("messages.deleteSuccess") ?? "Deleted successfully", "success");
      }
    },
    onError: (err) => {
      if (!isBulkRef.current) {
        toast(err.message, "error");
      }
    },
  });

  const rows = (data?.items ?? []) as GroupRow[];
  const serverTotalCount = data?.total ?? 0;

  // ── Column definitions ────────────────────────────────────────────────
  const columns: ColumnDef<GroupRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 80,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: t("table.name"),
        size: 250,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary whitespace-nowrap"
                onClick={() => setEditId(m.id)}
              >
                {m.name}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "code",
        header: t("table.code"),
        size: 200,
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {row.original.code}
          </code>
        ),
      },
      {
        accessorKey: "description",
        header: t("table.description"),
        size: 300,
        cell: ({ row }) => (
          <span
            className="text-sm text-muted-foreground line-clamp-1 max-w-[280px]"
            title={row.original.description ?? ""}
          >
            {row.original.description ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "customersCount",
        header: t("table.members"),
        size: 150,
        cell: ({ row }) => {
          const count = row.original._count.customers;
          return (
            <div className="flex w-[90px] justify-center">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border transition-colors",
                  count > 0
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border/40",
                )}
              >
                {count}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("table.createdAt"),
        size: 180,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  // ── Row actions ────────────────────────────────────────────────────────
  const rowActions: RowAction<GroupRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("editGroup"),
        icon: <Pencil size={16} />,
        color: "primary",
        onClick: (row) => setEditId(row.id),
      },
      {
        key: "delete",
        tooltip: t("deleteGroup"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("messages.confirmDelete"),
            onConfirm: () => deleteMut.mutate({ id: row.id }),
          });
        },
      },
    ],
    [t, askConfirm, deleteMut],
  );

  // ── Bulk actions ───────────────────────────────────────────────────────
  const bulkActionConfig: BulkActionConfig<GroupRow> = useMemo(
    () => ({
      onBulkDelete: (selected, clearSelection) => {
        askConfirm({
          message: t("messages.confirmDelete"),
          onConfirm: async () => {
            isBulkRef.current = true;
            try {
              await Promise.all(selected.map((r) => deleteMut.mutateAsync({ id: r.id })));
              toast(t("messages.deleteSuccess") ?? "Deleted", "success");
              clearSelection();
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : (tCommon("error") ?? "Error occurred");
              toast(msg, "error");
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
          {listError.message}
        </div>
      )}

      <DataTable<GroupRow>
        tableKey={tableKey}
        defaultPageSize={initialState.pageSize}
        defaultPage={initialState.page}
        data={rows}
        columns={columns}
        rowActions={rowActions}
        bulkActionConfig={bulkActionConfig}
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
          <Button id="create-group" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t("createNew")}
          </Button>
        }
        emptyState={
          <div className="py-8 text-center">
            <Users size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">{t("noGroups")}</p>
            <Button id="create-group-empty" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              {t("createNew")}
            </Button>
          </div>
        }
      />

      <GroupFormDrawer
        groupId={editId}
        open={createOpen || editId !== null}
        onClose={() => {
          setCreateOpen(false);
          setEditId(null);
        }}
        onSaved={() => {
          setCreateOpen(false);
          setEditId(null);
          refetch();
        }}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
