"use client";

import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDate, formatDateTime } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { Separator } from "@ecom/ui/components/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { cn } from "@ecom/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-100 text-emerald-800",
  INACTIVE: "border-neutral-200 bg-neutral-100 text-neutral-600",
  BANNED: "border-red-200 bg-red-100 text-red-800",
};

interface CustomerDetailDrawerProps {
  customerId: number | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function CustomerDetailDrawer({
  customerId,
  onClose,
  onDeleted,
}: CustomerDetailDrawerProps) {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("users");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const open = customerId !== null;

  const { data: detail, isLoading } = trpc.viewer.customers.get.useQuery(
    { id: customerId ?? 0 },
    { enabled: open },
  );

  const utils = trpc.useUtils();

  const updateMut = trpc.viewer.customers.update.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      utils.viewer.customers.get.invalidate({ id: customerId ?? 0 });
      toast(tCommon("success") ?? "Updated", "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const deleteMut = trpc.viewer.customers.remove.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      toast(tCommon("success") ?? "Deleted", "success");
      onDeleted();
    },
    onError: (err) => toast(err.message, "error"),
  });

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[420px]">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>{t("detail.title")}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {isLoading || !detail ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {(detail.name ?? detail.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{detail.name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{detail.email}</p>
                  </div>
                </div>

                <Separator />

                {/* Info rows */}
                {[
                  { label: tUsers("fields.username"), value: `@${detail.username}` },
                  { label: t("fields.phone"), value: detail.phone ?? "—" },
                  {
                    label: t("fields.verified"),
                    value: detail.emailVerified ? formatDate(detail.emailVerified) : tCommon("no"),
                  },
                  {
                    label: t("fields.lastLogin"),
                    value: detail.lastLoginAt
                      ? formatDateTime(detail.lastLoginAt)
                      : t("detail.never"),
                  },
                  { label: t("detail.customerSince"), value: formatDate(detail.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm">{value}</p>
                  </div>
                ))}

                <Separator />

                {/* Status changer */}
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">{t("detail.status")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["ACTIVE", "INACTIVE", "BANNED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={cn(
                          "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          detail.status === s
                            ? STATUS_BADGE[s]
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => updateMut.mutate({ id: detail.id, status: s })}
                        disabled={updateMut.isPending}
                      >
                        {t(`status.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social accounts */}
                {detail.socialAccounts.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        {tCommon("socialAccounts")}
                      </p>
                      <div className="flex flex-col gap-1">
                        {detail.socialAccounts.map((sa) => (
                          <div key={sa.id} className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                            <strong>{sa.provider}</strong> — {sa.email ?? sa.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Activity logs */}
                {detail.activityLogs.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        {tCommon("recentActivity")}
                      </p>
                      <div className="flex max-h-[180px] flex-col gap-1 overflow-y-auto">
                        {detail.activityLogs.map((al) => (
                          <div
                            key={al.id}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
                          >
                            <span className="text-xs font-medium">{al.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(al.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between border-t border-border px-6 py-4">
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMut.isPending || !detail}
              onClick={() =>
                askConfirm({
                  message: t("detail.deleteConfirm"),
                  onConfirm: () => deleteMut.mutate({ id: detail?.id ?? 0 }),
                })
              }
            >
              {deleteMut.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {tCommon("delete")}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {tCommon("close")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog {...confirmDialogProps} />
    </>
  );
}
