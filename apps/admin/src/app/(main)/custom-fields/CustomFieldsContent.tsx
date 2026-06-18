"use client";

import { FieldGroupFormDrawer } from "@admin/app/(main)/custom-fields/components/forms/FieldGroupFormDrawer";
import { StatusBadge } from "@admin/app/(main)/custom-fields/components/ui/StatusBadge";
import type { BulkActionConfig, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { downloadJson } from "@admin/lib/download";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { ExportImportControls } from "./components/ui/ExportImportControls";

type FieldGroup = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  _count: { items: number };
};

// ── Map DataTable server params → tRPC listGroups input ──────────────────────

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy: sort.direction ? (sort.key as "id" | "title" | "createdAt" | "status") : undefined,
    sortDir: sort.direction ?? undefined,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CustomFieldsContent() {
  const t = useTranslations("customFields");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "custom-fields",
    defaultSort: { key: "id", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, error, refetch } =
    trpc.viewer.customFields.listGroups.useQuery(queryInput, {
      placeholderData: keepPreviousData,
    });

  const rows: FieldGroup[] = (data?.rows ?? []).filter(
    (g): g is FieldGroup =>
      g.id !== undefined &&
      g.title !== undefined &&
      g.status !== undefined &&
      g.createdAt !== undefined &&
      g._count !== undefined,
  );

  const serverTotalCount = data?.total ?? 0;

  const deleteGroupMut = trpc.viewer.customFields.deleteGroup.useMutation({
    onSuccess: () => {
      utils.viewer.customFields.listGroups.invalidate();
      if (!isBulkRef.current) {
        toast(t("deleteGroupSuccess", { name: deletingNameRef.current }), "success");
      }
    },
    onError: () => {
      if (!isBulkRef.current) {
        toast(t("deleteGroupError", { name: deletingNameRef.current }), "error");
      }
    },
  });

  const deletingNameRef = useRef("");
  const isBulkRef = useRef(false);

  const updateGroupMut = trpc.viewer.customFields.updateGroup.useMutation({
    onSuccess: () => utils.viewer.customFields.listGroups.invalidate(),
  });

  function openCreate() {
    setEditingGroupId(null);
    setDrawerOpen(true);
  }

  const openEdit = useCallback((groupId: number) => {
    setEditingGroupId(groupId);
    setDrawerOpen(true);
  }, []);

  // ── Column definitions ─────────────────────────────────────────────────────

  const columns: ColumnDef<FieldGroup>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "title",
        header: t("tableColName"),
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary"
            onClick={() => openEdit(row.original.id)}
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("tableColCreatedAt"),
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("tableColStatus"),
        size: 140,
        meta: { align: "center" },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [t, openEdit],
  );

  // ── Filter fields (Botble-style) ──────────────────────────────────────────

  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        type: "number",
      },
      {
        key: "title",
        label: t("tableColName"),
        type: "text",
      },
      {
        key: "status",
        label: t("tableColStatus"),
        type: "select",
        options: [
          { value: "published", label: t("status.published") },
          { value: "pending", label: t("status.pending") },
          { value: "draft", label: t("status.draft") },
        ],
      },
      {
        key: "createdAt",
        label: t("tableColCreatedAt"),
        type: "date",
      },
    ],
    [t],
  );

  // ── Row actions ───────────────────────────────────────────────────────────

  const rowActions: RowAction<FieldGroup>[] = useMemo(
    () => [
      {
        key: "export",
        tooltip: t("exportGroup"),
        icon: <Download size={16} />,
        color: "primary",
        onClick: async (row) => {
          const exportData = await utils.viewer.customFields.exportGroups.fetch({ ids: [row.id] });
          await downloadJson(exportData, `custom-field-${row.id}.json`);
        },
      },
      {
        key: "edit",
        tooltip: t("editGroup"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => openEdit(row.id),
      },
      {
        key: "delete",
        tooltip: t("deleteGroup"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("deleteGroupConfirm", { name: row.title }),
            onConfirm: () => {
              deletingNameRef.current = row.title;
              deleteGroupMut.mutate({ id: row.id });
            },
          });
        },
      },
    ],
    [t, utils, deleteGroupMut, askConfirm, openEdit],
  );

  // ── Bulk action config (Botble-style dropdown) ───────────────────────────

  const bulkActionConfig: BulkActionConfig<FieldGroup> = useMemo(
    () => ({
      bulkChangeFields: [
        { key: "title", label: t("tableColName"), type: "text" as const },
        {
          key: "status",
          label: t("tableColStatus"),
          type: "select" as const,
          options: [
            { value: "published", label: t("status.published") },
            { value: "pending", label: t("status.pending") },
            { value: "draft", label: t("status.draft") },
          ],
        },
        { key: "createdAt", label: t("tableColCreatedAt"), type: "date" as const },
      ],
      onBulkChange: async (selected, fieldKey, value) => {
        try {
          await Promise.all(
            selected.map((r) => updateGroupMut.mutateAsync({ id: r.id, [fieldKey]: value })),
          );
          toast(t("bulkChangeSuccess", { count: selected.length }), "success");
        } catch {
          toast(t("bulkDeleteError"), "error");
        }
      },
      onBulkDelete: (selected, clearSelection) => {
        askConfirm({
          message: t("bulkDeleteConfirm", { count: selected.length }),
          onConfirm: async () => {
            isBulkRef.current = true;
            try {
              await Promise.all(selected.map((r) => deleteGroupMut.mutateAsync({ id: r.id })));
              toast(t("bulkDeleteSuccess", { count: selected.length }), "success");
              clearSelection();
            } catch {
              toast(t("bulkDeleteError"), "error");
            } finally {
              isBulkRef.current = false;
            }
          },
        });
      },
    }),
    [updateGroupMut, deleteGroupMut, t, toast, askConfirm],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {error.data?.code === "UNAUTHORIZED" ? t("unauthorized") : error.message}
        </div>
      )}

      <DataTable<FieldGroup>
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
          <div className="flex gap-2">
            <ExportImportControls
              onImported={() => utils.viewer.customFields.listGroups.invalidate()}
            />
            <Button id="create-field-group" size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {t("createGroup")}
            </Button>
          </div>
        }
        emptyState={
          <div className="py-8 text-center">
            <p className="mb-1 text-muted-foreground">{t("noGroupsTitle")}</p>
            <p className="mb-4 text-sm text-muted-foreground/60">{t("noGroupsSubtitle")}</p>
            <Button id="create-field-group-empty" size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              {t("newGroup")}
            </Button>
          </div>
        }
      />

      <FieldGroupFormDrawer
        open={drawerOpen}
        groupId={editingGroupId}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          utils.viewer.customFields.listGroups.invalidate();
        }}
      />
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
