"use client";

import { PostStatusBadge } from "@admin/components/blog/post-status-badge";
import type { BulkActionConfig, RowAction } from "@admin/components/data-table";
import { DataTable, toFilterInput } from "@admin/components/data-table";
import { useServerTable } from "@admin/components/data-table/hooks/useServerTable";
import type { DataTableServerParams, FilterFieldDef } from "@admin/components/data-table/types";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { useToast } from "@admin/components/toast-provider";
import { TranslationStatusIndicator } from "@admin/components/translation/TranslationStatusIndicator";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Folder, GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

type CategoryStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  status: string;
  order: number;
  createdAt: string;
  _count: { posts: number; children: number };
};

interface TreeCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  status: string;
  order: number;
  children: TreeCategory[];
}

const STATUS_BADGE_CONFIG: Record<string, string> = {
  PUBLISHED: "bg-emerald-500 text-white",
  PENDING: "bg-amber-500 text-white",
  DRAFT: "bg-neutral-400 text-white",
  ARCHIVED: "bg-rose-500 text-white",
};

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy: sort.direction
      ? (sort.key as "id" | "name" | "createdAt" | "status" | "order")
      : undefined,
    sortDir: sort.direction ?? undefined,
  };
}

export default function CategoriesContent() {
  const t = useTranslations("categories");
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "categories",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const {
    data,
    isLoading: listLoading,
    isFetching,
    error,
    refetch,
  } = trpc.viewer.categories.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    enabled: viewMode === "list",
  });

  const { data: treeData, isLoading: treeLoading } = trpc.viewer.categories.tree.useQuery(
    undefined,
    { enabled: viewMode === "tree" },
  );

  const rows = (data?.rows ?? []) as CategoryRow[];
  const categoryIds = rows.map((c) => c.id);

  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "category", entityIds: categoryIds },
    { staleTime: 30_000, enabled: categoryIds.length > 0 && viewMode === "list" },
  );

  const deleteMutation = trpc.viewer.categories.remove.useMutation({
    onSuccess: () => {
      utils.viewer.categories.list.invalidate();
      utils.viewer.categories.tree.invalidate();
      if (!isBulkRef.current) {
        toast(t("deleteCategorySuccess", { name: deletingNameRef.current }), "success");
      }
    },
    onError: () => {
      if (!isBulkRef.current) {
        toast(t("deleteCategoryError", { name: deletingNameRef.current }), "error");
      }
    },
  });

  const deletingNameRef = useRef("");
  const isBulkRef = useRef(false);

  const updateMutation = trpc.viewer.categories.update.useMutation({
    onSuccess: () => {
      utils.viewer.categories.list.invalidate();
      utils.viewer.categories.tree.invalidate();
    },
  });

  const serverTotalCount = data?.total ?? 0;

  // ── Column definitions ────────────────────────────────────────────────

  const columns: ColumnDef<CategoryRow>[] = useMemo(
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
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.icon && <span className="text-base">{row.original.icon}</span>}
            <div className="flex flex-col">
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left text-sm font-medium text-foreground hover:text-primary"
                onClick={() => router.push(`/categories/${row.original.id}/edit`)}
              >
                {row.original.name}
              </button>
              <span className="text-xs text-muted-foreground">/{row.original.slug}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
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
        accessorKey: "_count.posts",
        header: t("fields.postCount"),
        size: 100,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original._count.posts}</span>
        ),
      },
      {
        accessorKey: "order",
        header: t("fields.order"),
        size: 100,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.order}</span>
        ),
      },
      {
        id: "translations",
        header: "🌐",
        size: 120,
        cell: ({ row }) => (
          <TranslationStatusIndicator
            entityType="category"
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
        label: t("fields.name"),
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
          { value: "PUBLISHED", label: t("status.published") },
          { value: "PENDING", label: t("status.pending") },
          { value: "DRAFT", label: t("status.draft") },
          { value: "ARCHIVED", label: t("status.archived") },
        ],
      },
      {
        key: "order",
        label: t("fields.order"),
        type: "number",
        operators: [
          { value: "equals", label: "equals" },
          { value: "greaterThan", label: "greaterThan" },
          { value: "lessThan", label: "lessThan" },
        ],
      },
    ],
    [t],
  );

  // ── Row actions ───────────────────────────────────────────────────────────

  const rowActions: RowAction<CategoryRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("actions.edit"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => router.push(`/categories/${row.id}/edit`),
      },
      {
        key: "delete",
        tooltip: t("actions.delete"),
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => {
          askConfirm({
            message: t("deleteCategoryConfirm", { name: row.name }),
            onConfirm: () => {
              deletingNameRef.current = row.name;
              deleteMutation.mutate({ id: row.id });
            },
          });
        },
      },
    ],
    [t, deleteMutation, askConfirm, router],
  );

  // ── Bulk action config ───────────────────────────────────────────────────

  const bulkActionConfig: BulkActionConfig<CategoryRow> = useMemo(
    () => ({
      bulkChangeFields: [
        { key: "name", label: t("fields.name"), type: "text" as const },
        {
          key: "status",
          label: t("fields.status"),
          type: "select" as const,
          options: [
            { value: "PUBLISHED", label: t("status.published") },
            { value: "PENDING", label: t("status.pending") },
            { value: "DRAFT", label: t("status.draft") },
            { value: "ARCHIVED", label: t("status.archived") },
          ],
        },
      ],
      onBulkChange: async (selected, fieldKey, value) => {
        try {
          await Promise.all(
            selected.map((r) => updateMutation.mutateAsync({ id: r.id, [fieldKey]: value })),
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
    [updateMutation, deleteMutation, t, toast, askConfirm],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {error.data?.code === "UNAUTHORIZED" ? t("unauthorized") : error.message}
        </div>
      )}

      {viewMode === "list" ? (
        <DataTable<CategoryRow>
          tableKey={tableKey}
          defaultPageSize={initialState.pageSize}
          defaultPage={initialState.page}
          data={rows}
          columns={columns}
          rowActions={rowActions}
          bulkActionConfig={bulkActionConfig}
          filterFields={filterFields}
          isLoading={listLoading}
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
            <div className="flex items-center gap-2">
              <Button
                id="create-category"
                className="text-sm"
                size="sm"
                onClick={() => router.push("/categories/new")}
              >
                <Plus className="mr-2 size-4" />
                {t("newCategory")}
              </Button>
            </div>
          }
        />
      ) : (
        /* Tree View */
        <>
          <div className="mb-4 flex flex-col">
            <PageBreadcrumb className="mb-2" />
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <h2 className="flex-auto text-xl font-bold">{t("title")}</h2>
              <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Button
                  id="create-category"
                  className="text-sm"
                  size="sm"
                  onClick={() => router.push("/categories/new")}
                >
                  <Plus className="mr-2 size-4" />
                  {t("newCategory")}
                </Button>
              </div>
            </div>
          </div>
          <Card className="p-6">
            {treeLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !treeData?.length ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Folder size={48} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {treeData.map((cat) => (
                  <TreeNode key={cat.id} category={cat} depth={0} />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

function TreeNode({ category, depth }: { category: TreeCategory; depth: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg py-2 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {category.children.length > 0 && (
          <GitBranch size={14} className="text-muted-foreground/40" />
        )}
        {category.icon && <span>{category.icon}</span>}
        <NextLink
          href={`/categories/${category.id}/edit`}
          className="text-sm font-medium text-foreground hover:text-primary"
        >
          {category.name}
        </NextLink>
        <span className="text-xs text-muted-foreground/60">/{category.slug}</span>
        <PostStatusBadge status={category.status as CategoryStatus} />
      </div>
      {category.children.length > 0 && (
        <ul className="m-0 list-none p-0">
          {category.children.map((child) => (
            <TreeNode key={child.id} category={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
