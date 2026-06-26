"use client";

import { PermissionGuard, useRequirePermission } from "@admin/components/layout/PermissionGuard";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
import { Permissions } from "@ecom/lib/permissions";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, ArrowLeft, Plus, Trash2, Webhook } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type ViewMode = "list" | "create" | "logs";

export default function WebhooksPage() {
  const t = useTranslations("webhooks");
  const { hasPermission: canCreate } = useRequirePermission([Permissions.WEBHOOKS_CREATE]);
  const { hasPermission: canDelete } = useRequirePermission([Permissions.WEBHOOKS_DELETE]);

  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);

  const { data, isLoading } = trpc.viewer.webhooks.list.useQuery();
  const { data: events } = trpc.viewer.webhooks.availableEvents.useQuery();
  const { data: logs } = trpc.viewer.webhooks.logs.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: tRPC enabled-guard — query disabled when selectedId is null or view is not "logs"
    { webhookId: selectedId! },
    { enabled: !!selectedId && view === "logs" },
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.webhooks.create.useMutation({
    onSuccess: () => {
      utils.viewer.webhooks.list.invalidate();
      setView("list");
      resetForm();
    },
  });
  const deleteMutation = trpc.viewer.webhooks.delete.useMutation({
    onSuccess: () => utils.viewer.webhooks.list.invalidate(),
  });

  function resetForm() {
    setFormName("");
    setFormUrl("");
    setFormSecret("");
    setFormEvents([]);
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      name: formName,
      url: formUrl,
      secret: formSecret || undefined,
      events: formEvents,
    });
  }

  // Create view
  if (view === "create") {
    return (
      <PermissionGuard permissions={[Permissions.WEBHOOKS_CREATE]}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => setView("list")}
              aria-label={t("backToList")}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">{t("createWebhook")}</h1>
          </div>

          <Card className="max-w-2xl p-6">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wh-name">{t("form.name")}</Label>
                <Input
                  id="wh-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wh-url">{t("form.payloadUrl")}</Label>
                <Input
                  id="wh-url"
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                  placeholder={t("form.payloadUrlPlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wh-secret">{t("form.secret")}</Label>
                <Input
                  id="wh-secret"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder={t("form.secretPlaceholder")}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("fields.eventsSelected", { count: formEvents.length })}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {events?.map((event) => {
                    const checked = formEvents.includes(event);
                    return (
                      <label
                        key={event}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:border-primary/50",
                          checked ? "border-primary bg-primary/5" : "border-border",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(event)}
                          className="size-4 rounded border-border text-primary"
                        />
                        <span className="text-xs">{event}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {createMutation.error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                  <AlertCircle className="size-4 shrink-0" />
                  {createMutation.error.message}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || !formEvents.length}>
                  {createMutation.isPending ? t("form.creating") : t("form.create")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setView("list");
                    resetForm();
                  }}
                >
                  {t("form.cancel")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </PermissionGuard>
    );
  }

  // Logs view
  if (view === "logs" && selectedId) {
    return (
      <PermissionGuard permissions={[Permissions.WEBHOOKS_READ]}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => {
                setView("list");
                setSelectedId(null);
              }}
              aria-label={t("backToList")}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">{t("deliveryLogs")}</h1>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("fields.event")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("fields.status")}
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                      {t("fields.response")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("fields.date")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!logs?.length ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="flex flex-col items-center gap-2 py-8">
                          <p className="text-sm text-muted-foreground">{t("noDeliveryLogs")}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm">{log.event}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              log.success
                                ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                : "border-red-200 bg-red-100 text-red-800",
                            )}
                          >
                            {log.statusCode ?? "—"}
                          </span>
                        </td>
                        <td className="hidden max-w-[200px] px-4 py-3 md:table-cell">
                          <p className="truncate text-sm">{log.error ?? "OK"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </PermissionGuard>
    );
  }

  // List view
  return (
    <PermissionGuard permissions={[Permissions.WEBHOOKS_READ]}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          {canCreate && (
            <Button onClick={() => setView("create")}>
              <Plus className="mr-2 size-4" />
              {t("newWebhook")}
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("fields.name")}
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                    {t("fields.url")}
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                    {t("fields.events")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("fields.status")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {t("fields.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
                    <tr key={i} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    </tr>
                  ))
                ) : !data?.length ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Webhook size={48} className="text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">{t("noWebhooksTitle")}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((wh) => (
                    <tr key={wh.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{wh.name}</p>
                      </td>
                      <td className="hidden max-w-[250px] px-4 py-3 md:table-cell">
                        <p className="truncate text-sm text-muted-foreground">{wh.url}</p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {wh.events?.length ?? 0} {t("fields.events").toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            wh.isActive
                              ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                              : "border-neutral-200 bg-neutral-100 text-neutral-600",
                          )}
                        >
                          {wh.isActive ? t("status.active") : t("status.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedId(wh.id);
                              setView("logs");
                            }}
                          >
                            {t("actions.logs")}
                          </Button>
                          {canDelete && (
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                              aria-label={`${t("actions.delete")} webhook ${wh.name}`}
                              onClick={() => {
                                askConfirm({
                                  message: t("actions.deleteConfirm", { name: wh.name }),
                                  onConfirm: () => deleteMutation.mutate({ id: wh.id }),
                                });
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <ConfirmDialog {...confirmDialogProps} />
      </div>
    </PermissionGuard>
  );
}
