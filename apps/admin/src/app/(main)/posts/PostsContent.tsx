"use client";

import { PostStatusBadge } from "@admin/components/blog/post-status-badge";
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
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  Copy,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef } from "react";

type PostRow = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  isFeatured: boolean;
  views: number;
  status: string;
  authorId: number;
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  author?: { id: number; name: string | null; avatarUrl: string | null } | null;
  categories?: Array<{
    category: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
};

// ── Map DataTable server params → tRPC list input ────────────────────────────

function toQueryInput(params: DataTableServerParams) {
  const { search, filters, sort, page, pageSize } = params;

  return {
    page,
    pageSize,
    filters: toFilterInput(filters),
    search: search.trim() || undefined,
    sortBy: sort.direction
      ? (sort.key as "id" | "title" | "status" | "createdAt" | "publishedAt" | "views")
      : undefined,
    sortDir: sort.direction ?? undefined,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PostsContent() {
  const t = useTranslations("posts");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const { toast } = useToast();

  const { queryInput, onServerChange, tableKey, initialState } = useServerTable({
    tableId: "posts",
    defaultSort: { key: "createdAt", direction: "desc" },
    defaultPageSize: 25,
    toQueryInput,
  });

  const utils = trpc.useUtils();

  const { data, isLoading, isFetching, error, refetch } = trpc.viewer.posts.list.useQuery(
    queryInput,
    { placeholderData: keepPreviousData },
  );

  const rows = (data?.data ?? []) as PostRow[];
  const postIds = rows.map((p) => p.id);

  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "post", entityIds: postIds },
    { staleTime: 30_000, enabled: postIds.length > 0 },
  );

  const serverTotalCount = data?.meta.total ?? 0;

  // Mutations
  const updateMutation = trpc.viewer.posts.update.useMutation({
    onSuccess: () => utils.viewer.posts.list.invalidate(),
  });

  const publishMutation = trpc.viewer.posts.publish.useMutation({
    onSuccess: () => {
      utils.viewer.posts.list.invalidate();
      toast(tCommon("successUpdated"), "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const cloneMutation = trpc.viewer.posts.clone.useMutation({
    onSuccess: () => {
      utils.viewer.posts.list.invalidate();
      toast(tCommon("successCreated"), "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const deleteMutation = trpc.viewer.posts.remove.useMutation({
    onSuccess: () => {
      utils.viewer.posts.list.invalidate();
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

  const bulkDeleteMut = trpc.viewer.posts.bulkDelete.useMutation({
    onSuccess: () => utils.viewer.posts.list.invalidate(),
  });
  const bulkPublishMut = trpc.viewer.posts.bulkPublish.useMutation({
    onSuccess: () => utils.viewer.posts.list.invalidate(),
  });
  const bulkArchiveMut = trpc.viewer.posts.bulkArchive.useMutation({
    onSuccess: () => utils.viewer.posts.list.invalidate(),
  });

  // ── Column definitions ────────────────────────────────────────────────

  const columns: ColumnDef<PostRow>[] = useMemo(
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
              onClick={() => router.push(`/posts/${row.original.id}/edit`)}
            >
              {row.original.title}
            </button>
            {row.original.categories && row.original.categories.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {row.original.categories.map((pc) => (
                  <span
                    key={pc.category.id}
                    className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {pc.category.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("fields.status"),
        size: 120,
        cell: ({ row }) => (
          <PostStatusBadge
            status={row.original.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED"}
          />
        ),
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
        accessorKey: "views",
        header: t("fields.views"),
        size: 100,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.views?.toLocaleString() ?? 0}
          </span>
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
            entityType="post"
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

  const rowActions: RowAction<PostRow>[] = useMemo(
    () => [
      {
        key: "edit",
        tooltip: t("actions.edit"),
        icon: <Pencil size={16} />,
        color: "success",
        onClick: (row) => router.push(`/posts/${row.id}/edit`),
      },
      {
        key: "preview",
        tooltip: t("actions.preview"),
        icon: <ExternalLink size={16} />,
        onClick: (_row) => {
          // Placeholder action
        },
      },
      {
        key: "clone",
        tooltip: t("actions.clone"),
        icon: <Copy size={16} />,
        onClick: (row) => cloneMutation.mutate({ id: row.id }),
      },
      {
        key: "publish",
        tooltip: t("actions.publish"),
        icon: <Send size={16} />,
        color: "primary",
        hidden: (row) => row.status === "PUBLISHED",
        onClick: (row) => publishMutation.mutate({ id: row.id }),
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
    [t, askConfirm, router, cloneMutation, publishMutation, deleteMutation],
  );

  // ── Bulk action config ───────────────────────────────────────────────────

  const bulkActionConfig: BulkActionConfig<PostRow> = useMemo(
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
          const ids = selected.map((r) => r.id);
          if (fieldKey === "status") {
            if (value === "PUBLISHED") {
              await bulkPublishMut.mutateAsync({ ids });
            } else if (value === "ARCHIVED") {
              await bulkArchiveMut.mutateAsync({ ids });
            } else {
              await Promise.all(
                selected.map((r) =>
                  updateMutation.mutateAsync({
                    id: r.id,
                    status: value as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
                  }),
                ),
              );
            }
            toast(t("actions.bulkChangeSuccess", { count: selected.length }), "success");
          }
        } catch {
          toast(t("actions.bulkChangeError"), "error");
        }
      },
      onBulkDelete: (selected, clearSelection) => {
        askConfirm({
          message: t("actions.bulkDeleteConfirm", { count: selected.length }),
          onConfirm: async () => {
            isBulkRef.current = true;
            try {
              const ids = selected.map((r) => r.id);
              await bulkDeleteMut.mutateAsync({ ids });
              toast(t("actions.bulkDeleteSuccess", { count: selected.length }), "success");
              clearSelection();
            } catch {
              toast(t("actions.bulkDeleteError"), "error");
            } finally {
              isBulkRef.current = false;
            }
          },
        });
      },
    }),
    [t, askConfirm, toast, bulkPublishMut, bulkArchiveMut, bulkDeleteMut, updateMutation],
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

      <DataTable<PostRow>
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
            id="create-post"
            className="text-sm"
            size="sm"
            onClick={() => router.push("/posts/new")}
          >
            <Plus className="mr-2 size-4" />
            {t("newPost")}
          </Button>
        }
        emptyState={
          <div className="py-8 text-center">
            <FileText size={48} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="mb-1 text-muted-foreground">{t("noPostsTitle")}</p>
            <p className="mb-4 text-sm text-muted-foreground/60">{t("noPostsDescription")}</p>
            <Button
              id="create-post-empty"
              className="text-sm"
              size="sm"
              onClick={() => router.push("/posts/new")}
            >
              <Plus className="mr-2 size-4" />
              {t("newPost")}
            </Button>
          </div>
        }
      />

      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
