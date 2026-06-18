"use client";

import { PostStatusBadge } from "@admin/components/blog/post-status-badge";
import { DataTablePagination } from "@admin/components/DataTablePagination";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { StatusFilterBar } from "@admin/components/StatusFilterBar";
import { TranslationStatusIndicator } from "@admin/components/translation/TranslationStatusIndicator";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { Input } from "@ecom/ui/components/input";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import {
  AlertCircle,
  ArrowUpDown,
  Copy,
  ExternalLink,
  FileText,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

type StatusFilter = "ALL" | "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
type PostStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

const STATUS_FILTER_KEYS: { value: StatusFilter; tKey: string }[] = [
  { value: "ALL", tKey: "all" },
  { value: "PUBLISHED", tKey: "PUBLISHED" },
  { value: "DRAFT", tKey: "DRAFT" },
  { value: "PENDING", tKey: "PENDING" },
  { value: "ARCHIVED", tKey: "ARCHIVED" },
];

export default function PostsPage() {
  const t = useTranslations("posts");
  const tCommon = useTranslations("common");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "title" | "publishedAt" | "views">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.viewer.posts.list.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search || undefined,
    page,
    perPage: 20,
    sortBy,
    sortOrder,
  });

  const deleteMutation = trpc.viewer.posts.remove.useMutation({
    onSuccess: () => utils.viewer.posts.list.invalidate(),
  });

  const postIds = data?.data.map((p) => p.id) ?? [];
  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "post", entityIds: postIds },
    { staleTime: 30_000, enabled: postIds.length > 0 },
  );

  const publishMutation = trpc.viewer.posts.publish.useMutation({
    onSuccess: () => utils.viewer.posts.list.invalidate(),
  });

  function handleSort(key: typeof sortBy) {
    if (key === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  }

  function SortHeader({ field, children }: { field: typeof sortBy; children: React.ReactNode }) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => handleSort(field)}
      >
        {children}
        <ArrowUpDown size={12} className={cn(sortBy === field && "text-primary")} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb className="mb-0" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            {data && (
              <Badge variant="outline" className="text-xs">
                {data.meta.total} total
              </Badge>
            )}
          </div>
        </div>
        <Button asChild>
          <NextLink href="/posts/new">
            <FileText className="mr-2 size-4" />
            {t("newPost")}
          </NextLink>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilterBar
          value={statusFilter === "ALL" ? "" : statusFilter}
          onChange={(v) => {
            setStatusFilter(v === "" ? "ALL" : (v as StatusFilter));
            setPage(1);
          }}
          tabs={STATUS_FILTER_KEYS.map((s) => ({
            key: s.value === "ALL" ? "" : s.value,
            label: s.value === "ALL" ? tCommon("all") : t(`status.${s.tKey}`),
          }))}
          ariaLabel="Post status filter"
        />

        <Input
          id="posts-search"
          placeholder={tCommon("searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-[260px]"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {error.data?.code === "UNAUTHORIZED" ? tCommon("unauthorized") : error.message}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium">
                  <SortHeader field="title">{t("fields.title")}</SortHeader>
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  {t("fields.status")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  {t("fields.author")}
                </th>
                <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                  <SortHeader field="views">{t("fields.views")}</SortHeader>
                </th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
                  <SortHeader field="createdAt">{t("fields.date")}</SortHeader>
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  🌐
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t("fields.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                  <tr key={`sk-${i}`} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-[200px]" />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Skeleton className="h-4 w-[80px]" />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Skeleton className="h-4 w-[100px]" />
                    </td>
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <Skeleton className="h-4 w-[50px] ml-auto" />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Skeleton className="h-4 w-[100px]" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-4 w-8 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center gap-2 py-8">
                      <FileText size={48} className="text-muted-foreground/40" />
                      <p className="text-muted-foreground">{t("noPostsTitle")}</p>
                      <p className="text-sm text-muted-foreground/60">{t("noPostsDescription")}</p>
                      <Button size="sm" asChild className="mt-2">
                        <NextLink href="/posts/new">{t("createPost")}</NextLink>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((post) => (
                  <tr key={post.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <NextLink
                        href={`/posts/${post.id}/edit`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {post.title}
                      </NextLink>
                      {post.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {post.categories.map((pc) => (
                            <span
                              key={pc.category.id}
                              className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {pc.category.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <PostStatusBadge status={post.status as PostStatus} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {post.author?.name ?? "—"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {post.views?.toLocaleString() ?? 0}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(post.createdAt)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <TranslationStatusIndicator
                        entityType="post"
                        entityId={post.id}
                        batchMap={translationBatchMap}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                            aria-label={t("fields.actions")}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <NextLink href={`/posts/${post.id}/edit`}>
                              <Pencil className="mr-2 size-4" />
                              {t("actions.edit")}
                            </NextLink>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 size-4" />
                            {t("actions.preview")}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 size-4" />
                            {t("actions.clone")}
                          </DropdownMenuItem>
                          {post.status !== "PUBLISHED" && (
                            <DropdownMenuItem
                              onClick={() => publishMutation.mutate({ id: post.id })}
                              disabled={publishMutation.isPending}
                            >
                              <Send className="mr-2 size-4" />
                              {t("actions.publish")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              askConfirm({
                                message: t("actions.deleteConfirm"),
                                onConfirm: () => deleteMutation.mutate({ id: post.id }),
                              });
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          page={page}
          totalPages={data?.meta.lastPage ?? 1}
          onChange={setPage}
          total={data?.meta.total}
        />
      </Card>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
