"use client";
import { PostStatusBadge } from "@admin/components/blog/post-status-badge";
import { TranslationStatusIndicator } from "@admin/components/translation/TranslationStatusIndicator";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Folder, GitBranch, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

type CategoryStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

interface TreeCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  status: string;
  order: number;
  children: TreeCategory[];
}

export default function CategoriesPage() {
  const t = useTranslations("categories");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  const { data: listData, isLoading: listLoading } = trpc.viewer.categories.list.useQuery(
    { perPage: 100 },
    { enabled: viewMode === "list" },
  );

  const { data: treeData, isLoading: treeLoading } = trpc.viewer.categories.tree.useQuery(
    undefined,
    { enabled: viewMode === "tree" },
  );

  const utils = trpc.useUtils();
  const deleteMutation = trpc.viewer.categories.remove.useMutation({
    onSuccess: () => {
      utils.viewer.categories.list.invalidate();
      utils.viewer.categories.tree.invalidate();
    },
  });

  const categoryIds = listData?.items.map((c) => c.id) ?? [];
  const { data: translationBatchMap } = trpc.viewer.translations.batchTranslationStatus.useQuery(
    { entityType: "category", entityIds: categoryIds },
    { staleTime: 30_000, enabled: categoryIds.length > 0 },
  );

  const isLoading = viewMode === "list" ? listLoading : treeLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <NextLink href="/categories/new">
            <Plus className="mr-2 size-4" />
            {t("newCategory")}
          </NextLink>
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1">
        {(["list", "tree"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === mode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
            onClick={() => setViewMode(mode)}
          >
            {t(mode === "list" ? "viewList" : "viewTree")}
          </button>
        ))}
      </div>

      {/* Content */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("fields.name")}
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                    {t("fields.status")}
                  </th>
                  <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">
                    {t("fields.postCount")}
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                    {t("fields.order")}
                  </th>
                  <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground lg:table-cell">
                    🌐
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {t("fields.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!listData?.items.length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Folder size={48} className="text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  listData.items.map((cat) => (
                    <tr key={cat.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {cat.icon && <span>{cat.icon}</span>}
                          <div>
                            <NextLink
                              href={`/categories/${cat.id}/edit`}
                              className="text-sm font-medium text-foreground hover:underline"
                            >
                              {cat.name}
                            </NextLink>
                            <p className="text-xs text-muted-foreground/60">/{cat.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <PostStatusBadge status={cat.status as CategoryStatus} />
                      </td>
                      <td className="hidden px-4 py-3 text-right md:table-cell">
                        <span className="text-sm text-muted-foreground">{cat._count.posts}</span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="text-sm text-muted-foreground">{cat.order}</span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <TranslationStatusIndicator
                          entityType="category"
                          entityId={cat.id}
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
                              <NextLink href={`/categories/${cat.id}/edit`}>
                                <Pencil className="mr-2 size-4" />
                                {t("actions.edit")}
                              </NextLink>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                askConfirm({
                                  message: t("deleteConfirm"),
                                  onConfirm: () => deleteMutation.mutate({ id: cat.id }),
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
        ) : (
          /* Tree View */
          <div className="p-6">
            {!treeData?.length ? (
              <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {treeData.map((cat) => (
                  <TreeNode key={cat.id} category={cat} depth={0} />
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

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
          className="text-sm font-medium text-foreground hover:underline"
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
