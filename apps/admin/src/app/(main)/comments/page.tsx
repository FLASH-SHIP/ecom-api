"use client";

import { DataTablePagination } from "@admin/components/DataTablePagination";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Check, MessageSquare, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type StatusFilter = "pending" | "approved" | "spam" | "trash" | undefined;

const STATUS_KEYS = [
  { key: undefined as StatusFilter, tKey: "all" },
  { key: "pending" as StatusFilter, tKey: "pending" },
  { key: "approved" as StatusFilter, tKey: "approved" },
  { key: "spam" as StatusFilter, tKey: "spam" },
  { key: "trash" as StatusFilter, tKey: "trash" },
];

const STATUS_BADGE_VARIANT: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  spam: "bg-red-100 text-red-800 border-red-200",
  trash: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export default function CommentsPage() {
  const t = useTranslations("comments");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.viewer.comments.list.useQuery({
    status: statusFilter,
    page,
    perPage: 20,
  });
  const { data: counts } = trpc.viewer.comments.statusCounts.useQuery();
  const utils = trpc.useUtils();

  const invalidateAll = () => {
    utils.viewer.comments.list.invalidate();
    utils.viewer.comments.statusCounts.invalidate();
  };
  const approveMutation = trpc.viewer.comments.approve.useMutation({ onSuccess: invalidateAll });
  const spamMutation = trpc.viewer.comments.markSpam.useMutation({ onSuccess: invalidateAll });
  const trashMutation = trpc.viewer.comments.trash.useMutation({ onSuccess: invalidateAll });
  const deleteMutation = trpc.viewer.comments.delete.useMutation({ onSuccess: invalidateAll });

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_KEYS.map((tab) => {
          const count =
            tab.key === undefined
              ? Object.values(counts ?? {}).reduce((a: number, b) => a + (b as number), 0)
              : ((counts as Record<string, number> | undefined)?.[tab.key] ?? 0);
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key ?? "all"}
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
            >
              {t(`status.${tab.tKey}`)}
              <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-muted px-1 text-[11px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("fields.author")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("fields.comment")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  {t("fields.status")}
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  {t("fields.date")}
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
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-[120px]" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4" />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <Skeleton className="h-4 w-[80px]" />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Skeleton className="h-4 w-[80px]" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Skeleton className="h-4 w-[160px] ml-auto" />
                    </td>
                  </tr>
                ))
              ) : !data?.items.length ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center gap-2 py-8">
                      <MessageSquare size={48} className="text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">{t("noCommentsTitle")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.items.map((comment) => (
                  <tr key={comment.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">
                        {comment.authorName ?? t("fields.anonymous")}
                      </p>
                      <p className="text-xs text-muted-foreground">{comment.authorEmail ?? "—"}</p>
                    </td>
                    <td className="max-w-[300px] px-4 py-3">
                      <p className="truncate text-sm">{comment.content}</p>
                      {comment._count?.replies > 0 && (
                        <p className="text-xs text-primary">
                          {t("fields.replies", { count: comment._count.replies })}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className={cn(
                          "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          STATUS_BADGE_VARIANT[comment.status] ??
                            "bg-neutral-100 text-neutral-600 border-neutral-200",
                        )}
                      >
                        {t(`status.${comment.status}`)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {comment.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => approveMutation.mutate({ id: comment.id })}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="mr-1.5 size-4" />
                            {t("actions.approve")}
                          </Button>
                        )}
                        {comment.status !== "spam" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-600 hover:text-amber-700"
                            onClick={() => spamMutation.mutate({ id: comment.id })}
                            disabled={spamMutation.isPending}
                          >
                            <ShieldAlert className="mr-1.5 size-4" />
                            {t("actions.spam")}
                          </Button>
                        )}
                        {comment.status !== "trash" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => trashMutation.mutate({ id: comment.id })}
                            disabled={trashMutation.isPending}
                          >
                            {t("actions.trash")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              askConfirm({
                                message: t("actions.permanentlyDelete"),
                                onConfirm: () => deleteMutation.mutate({ id: comment.id }),
                              });
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-1.5 size-4" />
                            {t("actions.delete")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          total={data?.total}
        />
      </Card>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
