"use client";

import { DataTablePagination } from "@admin/components/DataTablePagination";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate } from "@admin/utils/dateFormat";
import { Permissions } from "@ecom/lib/permissions";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Separator } from "@ecom/ui/components/separator";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Archive, Mail, Reply, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type StatusFilter = "new" | "read" | "replied" | "archived" | undefined;

const STATUS_KEYS = [
  { key: undefined as StatusFilter, tKey: "all" },
  { key: "new" as StatusFilter, tKey: "new" },
  { key: "read" as StatusFilter, tKey: "read" },
  { key: "replied" as StatusFilter, tKey: "replied" },
  { key: "archived" as StatusFilter, tKey: "archived" },
];

const STATUS_BADGE_VARIANT: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  read: "bg-amber-100 text-amber-800 border-amber-200",
  replied: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export default function ContactsPage() {
  const t = useTranslations("contacts");
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = trpc.viewer.contacts.list.useQuery({
    status: statusFilter,
    page,
    perPage: 20,
  });
  const { data: counts } = trpc.viewer.contacts.statusCounts.useQuery();
  const { data: detail } = trpc.viewer.contacts.get.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: tRPC enabled-guard — query disabled when selectedId is null
    { id: selectedId! },
    { enabled: !!selectedId },
  );
  const utils = trpc.useUtils();

  const invalidateAll = () => {
    utils.viewer.contacts.list.invalidate();
    utils.viewer.contacts.statusCounts.invalidate();
    if (selectedId) utils.viewer.contacts.get.invalidate({ id: selectedId });
  };

  const updateStatusMutation = trpc.viewer.contacts.updateStatus.useMutation({
    onSuccess: invalidateAll,
  });
  const deleteMutation = trpc.viewer.contacts.delete.useMutation({
    onSuccess: () => {
      utils.viewer.contacts.list.invalidate();
      utils.viewer.contacts.statusCounts.invalidate();
      setSelectedId(null);
    },
  });
  const markRepliedMutation = trpc.viewer.contacts.markReplied.useMutation({
    onSuccess: invalidateAll,
  });

  const totalPages = data ? Math.ceil(data.total / data.perPage) : 1;

  return (
    <PermissionGuard permissions={[Permissions.CONTACTS_READ]}>
      <div className="flex flex-col gap-6">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Table */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t("fields.contact")}
                      </th>
                      <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                        {t("fields.subject")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {t("fields.status")}
                      </th>
                      <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                        {t("fields.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                        <tr key={i} className="border-b border-border">
                          <td colSpan={4} className="px-4 py-3">
                            <Skeleton className="h-4" />
                          </td>
                        </tr>
                      ))
                    ) : !data?.items.length ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="flex flex-col items-center gap-2 py-8">
                            <Mail size={48} className="text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                              {t("noSubmissionsTitle")}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.items.map((sub) => (
                        <tr
                          key={sub.id}
                          className={cn(
                            "cursor-pointer border-b border-border transition-colors hover:bg-muted/30",
                            selectedId === sub.id && "bg-primary/5",
                          )}
                          onClick={() => setSelectedId(sub.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">{sub.email}</p>
                          </td>
                          <td className="hidden max-w-[200px] px-4 py-3 md:table-cell">
                            <p className="truncate text-sm">{sub.subject ?? "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                STATUS_BADGE_VARIANT[sub.status] ??
                                  "bg-neutral-100 text-neutral-600 border-neutral-200",
                              )}
                            >
                              {t(`status.${sub.status}`)}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(sub.createdAt)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <DataTablePagination page={page} totalPages={totalPages} onChange={setPage} />
            </Card>
          </div>

          {/* Detail Panel */}
          <Card className="self-start p-5">
            {selectedId && detail ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t("submissionDetail")}</p>
                  <span
                    className={cn(
                      "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      STATUS_BADGE_VARIANT[detail.status] ??
                        "bg-neutral-100 text-neutral-600 border-neutral-200",
                    )}
                  >
                    {t(`status.${detail.status}`)}
                  </span>
                </div>
                {[
                  { label: t("fields.name"), value: detail.name },
                  { label: t("fields.email"), value: detail.email },
                  ...(detail.phone ? [{ label: t("fields.phone"), value: detail.phone }] : []),
                  ...(detail.subject
                    ? [{ label: t("fields.subject"), value: detail.subject }]
                    : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-muted-foreground">{t("fields.message")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{detail.message}</p>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {detail.status !== "replied" && (
                    <Button
                      size="sm"
                      onClick={() => markRepliedMutation.mutate({ id: detail.id })}
                      disabled={markRepliedMutation.isPending}
                    >
                      <Reply className="mr-1.5 size-4" />
                      {t("actions.markReplied")}
                    </Button>
                  )}
                  {detail.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: detail.id, status: "archived" })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <Archive className="mr-1.5 size-4" />
                      {t("actions.archive")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      askConfirm({
                        message: t("actions.permanentlyDelete"),
                        onConfirm: () => deleteMutation.mutate({ id: detail.id }),
                      });
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 size-4" />
                    {t("actions.delete")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-2">
                <Mail className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("selectToView")}</p>
              </div>
            )}
          </Card>
        </div>
        <ConfirmDialog {...confirmDialogProps} />
      </div>
    </PermissionGuard>
  );
}
