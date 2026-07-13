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
import { useState } from "react";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-100 text-emerald-800",
  INACTIVE: "border-neutral-200 bg-neutral-100 text-neutral-600",
  BANNED: "border-red-200 bg-red-100 text-red-800",
};

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex drawer UI rendering with tabs and lists
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

  const [activeTab, setActiveTab] = useState<"activity" | "history">("activity");

  const { data: detail, isLoading } = trpc.viewer.customers.get.useQuery(
    { id: customerId ?? "" },
    { enabled: open },
  );

  const { data: auditLogs, isLoading: isAuditLoading } =
    trpc.viewer.customers.auditHistory.useQuery(
      { id: customerId ?? "" },
      { enabled: open && activeTab === "history" },
    );

  const utils = trpc.useUtils();

  const updateMut = trpc.viewer.customers.update.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      utils.viewer.customers.get.invalidate({ id: customerId ?? "" });
      toast(tCommon("successUpdated"), "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const deleteMut = trpc.viewer.customers.remove.useMutation({
    onSuccess: () => {
      utils.viewer.customers.list.invalidate();
      toast(tCommon("successDeleted"), "success");
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
                  {
                    label: "Nhóm khách hàng",
                    value: detail.group
                      ? `${detail.group.name} (${detail.group.code})`
                      : "Không phân nhóm",
                  },
                  { label: t("fields.phone"), value: detail.phone ?? "—" },
                  {
                    label: t("form.genderLabel"),
                    value: detail.gender
                      ? t(`gender.${detail.gender as "male" | "female" | "other"}`)
                      : "—",
                  },
                  {
                    label: t("form.dobLabel"),
                    value: detail.dob ? formatDate(detail.dob) : "—",
                  },
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
                  { label: tCommon("createdAt"), value: formatDate(detail.createdAt) },
                  { label: t("form.descriptionLabel"), value: detail.description ?? "—" },
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
                        onClick={() => {
                          if (detail.status === s) return;
                          askConfirm({
                            title: t("detail.statusConfirmTitle"),
                            message: t("detail.statusConfirm", { status: t(`status.${s}`) }),
                            confirmLabel: t("detail.statusConfirmButton"),
                            confirmColor: "warning",
                            onConfirm: () => updateMut.mutate({ id: detail.id, status: s }),
                          });
                        }}
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

                <Separator />

                {/* Tabs for Activity / History */}
                <div className="flex flex-col gap-3">
                  <div className="flex border-b border-border">
                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className={cn(
                        "flex-1 pb-2 text-center text-xs font-semibold border-b-2 transition-colors cursor-pointer",
                        activeTab === "activity"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t("detail.tabs.activity")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("history")}
                      className={cn(
                        "flex-1 pb-2 text-center text-xs font-semibold border-b-2 transition-colors cursor-pointer",
                        activeTab === "history"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t("detail.tabs.history")}
                    </button>
                  </div>

                  {activeTab === "activity" && (
                    <div>
                      {detail.activityLogs.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-4">
                          {tCommon("noResults")}
                        </p>
                      ) : (
                        <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-1">
                          {detail.activityLogs.map((al) => (
                            <div
                              key={al.id}
                              className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
                            >
                              <span className="text-xs font-medium">{al.action}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(al.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "history" && (
                    <div className="flex flex-col gap-2">
                      {isAuditLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : !auditLogs || auditLogs.items.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-4">
                          {t("detail.history.noHistory")}
                        </p>
                      ) : (
                        <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
                          {auditLogs.items.map((log) => (
                            <div
                              key={log.id}
                              className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/20 p-2.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-primary">{log.action}</span>
                                <span className="text-muted-foreground text-[10px]">
                                  {formatDateTime(log.createdAt)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground border-t border-border/50 pt-1.5">
                                <div>
                                  <span className="font-medium text-foreground">
                                    {t("detail.history.actor")}:
                                  </span>{" "}
                                  {log.user?.name ?? "System"}
                                </div>
                                {log.ipAddress && (
                                  <div className="text-right">
                                    <span>IP:</span> {log.ipAddress}
                                  </div>
                                )}
                              </div>

                              {/* Render Changed Values/Diffs */}
                              {log.action === "UPDATE" && log.oldValues && log.newValues && (
                                <div className="mt-1 flex flex-col gap-1 rounded bg-muted/60 p-1.5 text-[10px]">
                                  {Object.keys(log.newValues as Record<string, unknown>).map(
                                    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: detailed key-value diff comparison and normalized date checking
                                    (key) => {
                                      const newVal = (log.newValues as Record<string, unknown>)[
                                        key
                                      ];
                                      const oldVal = (log.oldValues as Record<string, unknown>)[
                                        key
                                      ];

                                      // Handle dates
                                      const normNew =
                                        newVal instanceof Date ? newVal.toISOString() : newVal;
                                      const normOld =
                                        oldVal instanceof Date ? oldVal.toISOString() : oldVal;

                                      if (
                                        JSON.stringify(normNew) === JSON.stringify(normOld) ||
                                        key === "id"
                                      )
                                        return null;

                                      return (
                                        <div
                                          key={key}
                                          className="flex flex-col border-b border-border/30 pb-1 last:border-0 last:pb-0"
                                        >
                                          <span className="font-semibold text-foreground">
                                            {key}
                                          </span>
                                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                            <span className="line-through text-red-500 bg-red-50 px-1 rounded-sm border border-red-100">
                                              {oldVal === null || oldVal === undefined
                                                ? "null"
                                                : String(oldVal)}
                                            </span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="text-emerald-700 bg-emerald-50 px-1 rounded-sm border border-emerald-100 font-medium">
                                              {newVal === null || newVal === undefined
                                                ? "null"
                                                : String(newVal)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              )}

                              {/* Render New Entity (CREATE) */}
                              {log.action === "CREATE" && log.newValues && (
                                <div className="mt-1 flex flex-col gap-1 rounded bg-muted/60 p-1.5 text-[10px]">
                                  {Object.keys(log.newValues as Record<string, unknown>).map(
                                    (key) => {
                                      const val = (log.newValues as Record<string, unknown>)[key];
                                      if (val === null || val === undefined || key === "id")
                                        return null;
                                      return (
                                        <div
                                          key={key}
                                          className="flex items-center justify-between"
                                        >
                                          <span className="font-semibold text-foreground">
                                            {key}:
                                          </span>
                                          <span className="text-emerald-700 font-medium">
                                            {String(val)}
                                          </span>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  onConfirm: () => deleteMut.mutate({ id: detail?.id ?? "" }),
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
