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
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef } from "react";

type PageRow = {
  id: number;
  title: string;
  slug: string;
  template: string | null;
  order: number;
  status: string;
  parentId: number | null;
  authorId: number;
  author?: { id: number; name: string | null } | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { children: number };
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "border-neutral-200 bg-neutral-100 text-neutral-600",
  PUBLISHED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  PENDING: "border-amber-200 bg-amber-100 text-amber-800",
  ARCHIVED: "border-red-200 bg-red-100 text-red-800",
};

function PageStatusBadge({ status }: { status: string }) {
  const classes = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT;
  return (
    <span
      className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium", classes)}
    >
      {status}
    </span>
  );
}

// ── Map DataTable server params → tRPC list input ────────────────────────────

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy: sort.direction
      ? (sort.key as "id" | "title" | "status" | "createdAt" | "order")
      : undefined,
    sortDir: sort.direction ?? undefined,
  };
}

// ── PagesContent Component ───────────────────────────────────────────────────

export default function PagesContent() {
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "pages",
    defaultSort: { key: "order", direction: "asc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, error, refetch } = trpc.viewer.pages.list.useQuery(
    queryInput,
    { placeholderData: keepPreviousData },
  );

  const rows = (data?.data ?? []) as PageRow[];
  const pageIds = rows.map((p) => p.id);

  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "page", entityIds: pageIds },
    { staleTime: 30_000, enabled: pageIds.length > 0 },
  );

  const serverTotalCount = data?.meta.total ?? 0;

  // Mutations
  const updateMutation = trpc.viewer.pages.update.useMutation({
    onSuccess: () => utils.viewer.pages.list.invalidate(),
  });

  const deleteMutation = trpc.viewer.pages.remove.useMutation({
    onSuccess: () => {
      utils.viewer.pages.list.invalidate();
      if (!isBulkRef.current) {
        toast(tCommon("successDeleted"), "success");
      }
    },
    onError: (err) => {
      if (!isBulkRef.current) {
        toast(err.message, "error");
      }
    },
  });

  const isBulkRef = useRef(false);

  // ── Column definitions ────────────────────────────────────────────────

  const columns: ColumnDef<PageRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.id}</span>,
      },
      {
        accessorKey: "title",
        header: t("fields.title"),
        size: 300,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <button
              type="button"
              className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary"
              onClick={() => router.push(`/pages/${row.original.id}/edit`)}
            >
              {row.original.title}
            </button>
            <p className="text-xs text-muted-foreground">
              /{row.original.slug}
              {row.original._count.children > 0 && (
                <span className="ml-1 text-primary">({row.original._count.children} children)</span>
              )}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "template",
        header: t("fields.template"),
        size: 150,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.template ?? "default"}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        size: 120,
        cell: ({ row }) => <PageStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "author.name",
        header: t("fields.author"),
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.author?.name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("fields.date"),
        size: 180,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "translations",
        header: "🌐",
        size: 120,
        cell: ({ row }) => (
          <TranslationStatusIndicator
            entityType="page"
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
        key: "title",
        label: t("fields.title"),
        type: "text",
        operators: [
          { value: "contains", label: "contains" },
          { value: "equals", label: "equals" },
          { value: "startsWith", label: "startsWith" },
        ],
      },
      {
        key: "status",
        label: t("fields.status"),
        type: "select",
        operators: [{ value: "equals", label: "equals" }],
        options: [
          { value: "PUBLISHED", label: t("status.PUBLISHED") },
          { value: "DRAFT", label: t("status.DRAFT") },
          { value: "PENDING", label: t("status.PENDING") },
          { value: "ARCHIVED", label: t("status.ARCHIVED") },
        ],
      },
      {
        key: "createdAt",
        label: t("fields.date"),
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

  const rowActions: RowAction<PageRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("actions.edit"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => router.push(`/pages/${row.id}/edit`),
      },
      {
        key: "delete",
        tooltip: t("actions.delete"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("actions.deleteConfirm"),
            onConfirm: () => deleteMutation.mutate({ id: row.id }),
          });
        },
      },
    ],
    [t, askConfirm, router, deleteMutation],
  );

  // ── Bulk action config ───────────────────────────────────────────────────

  const bulkActionConfig: BulkActionConfig<PageRow> = useMemo(
    () => ({
      bulkChangeFields: [
        {
          key: "status",
          label: t("fields.status"),
          type: "select" as const,
          options: [
            { value: "PUBLISHED", label: t("status.PUBLISHED") },
            { value: "DRAFT", label: t("status.DRAFT") },
            { value: "PENDING", label: t("status.PENDING") },
            { value: "ARCHIVED", label: t("status.ARCHIVED") },
          ],
        },
      ],
      onBulkChange: async (selected, fieldKey, value) => {
        try {
          if (fieldKey === "status") {
            await Promise.all(
              selected.map((r) =>
                updateMutation.mutateAsync({
                  id: r.id,
                  status: value as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
                }),
              ),
            );
            toast(t("bulkChangeSuccess", { count: selected.length }), "success");
          }
        } catch {
          toast(t("bulkChangeError"), "error");
        }
      },
      onBulkDelete: (selected, clearSelection) => {
        askConfirm({
          message: t("bulkDeleteConfirm", { count: selected.length }),
          onConfirm: async () => {
            isBulkRef.current = true;
            try {
              await Promise.all(selected.map((r) => deleteMutation.mutateAsync({ id: r.id })));
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
    [t, askConfirm, toast, updateMutation, deleteMutation],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {error.data?.code === "UNAUTHORIZED" ? tCommon("unauthorized") : error.message}
        </div>
      )}

      <DataTable<PageRow>
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
            id="create-page"
            className="text-sm"
            size="sm"
            onClick={() => router.push("/pages/new")}
          >
            <Plus className="mr-2 size-4" />
            {t("newPage")}
          </Button>
        }
        emptyState={
          <div className="py-8 text-center">
            <FileText size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">{t("noPagesTitle")}</p>
            <p className="mb-4 text-sm text-muted-foreground/60">{t("noPagesDescription")}</p>
            <Button
              id="create-page-empty"
              className="text-sm"
              size="sm"
              onClick={() => router.push("/pages/new")}
            >
              <Plus className="mr-2 size-4" />
              {t("newPage")}
            </Button>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
