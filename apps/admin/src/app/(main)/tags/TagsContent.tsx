"use client";
import type { BulkActionConfig, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import { useToast } from "@admin/components/toast-provider";
import { TranslationStatusIndicator } from "@admin/components/translation/TranslationStatusIndicator";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef } from "react";

type TagRow = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  _count: { posts: number };
};

const STATUS_BADGE_CONFIG: Record<string, string> = {
  PUBLISHED: "bg-emerald-500 text-white",
  PENDING: "bg-amber-500 text-white",
  DRAFT: "bg-neutral-400 text-white",
};

// ── Map DataTable server params → tRPC list input ────────────────────────────

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy: sort.direction ? (sort.key as "id" | "name" | "createdAt" | "status") : undefined,
    sortDir: sort.direction ?? undefined,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TagsContent() {
  const t = useTranslations("tags");
  const router = useRouter();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "tags",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, error, refetch } = trpc.viewer.tags.list.useQuery(
    queryInput,
    { placeholderData: keepPreviousData },
  );

  const rows = (data?.rows ?? []) as TagRow[];

  const tagIds = rows.map((t) => t.id);
  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "tag", entityIds: tagIds },
    { staleTime: 30_000, enabled: tagIds.length > 0 },
  );

  const serverTotalCount = data?.total ?? 0;

  const deleteTagMut = trpc.viewer.tags.remove.useMutation({
    onSuccess: () => {
      utils.viewer.tags.list.invalidate();
      if (!isBulkRef.current) {
        toast(t("deleteTagSuccess", { name: deletingNameRef.current }), "success");
      }
    },
    onError: () => {
      if (!isBulkRef.current) {
        toast(t("deleteTagError", { name: deletingNameRef.current }), "error");
      }
    },
  });

  const deletingNameRef = useRef("");
  const isBulkRef = useRef(false);

  const updateTagMut = trpc.viewer.tags.update.useMutation({
    onSuccess: () => utils.viewer.tags.list.invalidate(),
  });

  // ── Column definitions ────────────────────────────────────────────────

  const columns: ColumnDef<TagRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "name",
        header: t("tableColName"),
        size: 250,
        cell: ({ row }) => (
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary"
            onClick={() => router.push(`/tags/${row.original.id}/edit`)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("tableColCreatedAt"),
        size: 200,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("tableColStatus"),
        size: 150,
        cell: ({ row }) => {
          const status = row.original.status;
          const colorClass = STATUS_BADGE_CONFIG[status] ?? "bg-neutral-400 text-white";
          let label: string;
          try {
            label = t(`status.${status.toLowerCase()}` as Parameters<typeof t>[0]);
          } catch {
            label = status;
          }
          return (
            <span
              className={cn(
                "inline-block min-w-[80px] rounded-full px-3 py-0.5 text-center text-xs font-semibold",
                colorClass,
              )}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: "translations",
        header: "🌐",
        size: 120,
        cell: ({ row }) => (
          <TranslationStatusIndicator
            entityType="tag"
            entityId={row.original.id}
            batchMap={translationBatchMap}
          />
        ),
      },
    ],
    [t, router, translationBatchMap],
  );

  // ── Filter fields (Botble-style) ──────────────────────────────────────────

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
        key: "name",
        label: t("tableColName"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
          { value: "startsWith", label: "startsWith" },
        ],
      },
      {
        key: "status",
        label: t("tableColStatus"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "PUBLISHED", label: t("status.published") },
          { value: "PENDING", label: t("status.pending") },
          { value: "DRAFT", label: t("status.draft") },
        ],
      },
      {
        key: "createdAt",
        label: t("tableColCreatedAt"),
        type: "date",
        operators: [
          { value: "greaterThanOrEqual", label: "greaterThanOrEqual" },
          { value: "lessThanOrEqual", label: "lessThanOrEqual" },
        ],
      },
    ],
    [t],
  );

  // ── Row actions ───────────────────────────────────────────────────────────

  const rowActions: RowAction<TagRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("editTag"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => router.push(`/tags/${row.id}/edit`),
      },
      {
        key: "delete",
        tooltip: t("deleteTag"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("deleteTagConfirm", { name: row.name }),
            onConfirm: () => {
              deletingNameRef.current = row.name;
              deleteTagMut.mutate({ id: row.id });
            },
          });
        },
      },
    ],
    [t, deleteTagMut, askConfirm, router],
  );

  // ── Bulk action config (Botble-style dropdown) ───────────────────────────

  const bulkActionConfig: BulkActionConfig<TagRow> = useMemo(
    () => ({
      bulkChangeFields: [
        { key: "name", label: t("tableColName"), type: "text" as const },
        {
          key: "status",
          label: t("tableColStatus"),
          type: "select" as const,
          options: [
            { value: "PUBLISHED", label: t("status.published") },
            { value: "PENDING", label: t("status.pending") },
            { value: "DRAFT", label: t("status.draft") },
          ],
        },
      ],
      onBulkChange: async (selected, fieldKey, value) => {
        try {
          await Promise.all(
            selected.map((r) => updateTagMut.mutateAsync({ id: r.id, [fieldKey]: value })),
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
              await Promise.all(selected.map((r) => deleteTagMut.mutateAsync({ id: r.id })));
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
    [updateTagMut, deleteTagMut, t, toast, askConfirm],
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

      <DataTable<TagRow>
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
          <Button
            id="create-tag"
            className="text-sm"
            size="sm"
            onClick={() => router.push("/tags/create")}
          >
            <Plus className="mr-2 size-4" />
            {t("createTag")}
          </Button>
        }
        emptyState={
          <div className="py-8 text-center">
            <Tag size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">{t("noTagsTitle")}</p>
            <p className="mb-4 text-sm text-muted-foreground/60">{t("noTagsSubtitle")}</p>
            <Button
              id="create-tag-empty"
              className="text-sm"
              size="sm"
              onClick={() => router.push("/tags/create")}
            >
              <Plus className="mr-2 size-4" />
              {t("createTag")}
            </Button>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
