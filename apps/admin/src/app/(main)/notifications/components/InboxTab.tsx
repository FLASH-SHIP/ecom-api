"use client";

import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Bell, CheckCheck, ChevronLeft, Eye, EyeOff, Search, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const TYPE_ICON: Record<string, string> = {
  comment: "💬",
  contact: "📩",
  webhook: "🔗",
  manual: "📢",
};

const getLocalizedType = (type: string, t: (key: string) => string) => {
  const key = type.toLowerCase();
  if (key === "manual.broadcast") return t("typeManualBroadcast");
  if (key === "comment") return t("typeComment");
  if (key === "contact") return t("typeContact");
  if (key === "webhook") return t("typeWebhook");
  if (key === "manual") return t("typeManual");
  return type;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: InboxTab contains interactive tab and list logic
export function InboxTab() {
  const t = useTranslations("notifications");
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const [perPage, setPerPage] = useState(30);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (search.trim() === "" || search.trim().length >= 2) {
        setDebouncedSearch(search);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset pagination when search or filterType changes to avoid skipped items
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset pagination when filters change
  useEffect(() => {
    setPerPage(30);
  }, [debouncedSearch, filterType]);

  const { data, isLoading, isFetching } = trpc.viewer.notifications.list.useQuery({
    page: 1,
    perPage,
    search: debouncedSearch || undefined,
    type: filterType || undefined,
  });

  const showSkeletons = isLoading || isFetching;

  const invalidate = () => {
    utils.viewer.notifications.list.invalidate();
    utils.viewer.notifications.unreadCount.invalidate();
  };

  const markRead = trpc.viewer.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markAllRead = trpc.viewer.notifications.markAllRead.useMutation({ onSuccess: invalidate });
  const deleteNotification = trpc.viewer.notifications.delete.useMutation({
    onSuccess: (_res, variables) => {
      invalidate();
      if (variables && selectedId === variables.id) {
        setSelectedId(null);
      }
    },
  });

  const notifications = data?.items ?? [];
  const filteredNotifications = notifications;

  const selectedNotification = useMemo(() => {
    return notifications.find((n) => n.id === selectedId);
  }, [notifications, selectedId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
      {/* Left Pane: Inbox List (5 cols) */}
      <Card
        className={cn(
          "lg:col-span-5 flex flex-col p-4 space-y-4 overflow-hidden border-border bg-card h-full",
          selectedId !== null && "hidden lg:flex",
        )}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("unread", { count: notifications.filter((n) => !n.isRead).length })}
          </span>
          {notifications.some((n) => !n.isRead) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 text-xs text-primary hover:bg-primary/10"
            >
              <CheckCheck className="mr-1.5 size-3.5" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={filterType === null ? "default" : "outline"}
            onClick={() => setFilterType(null)}
            className="h-7 text-[11px]"
          >
            {t("filterAll")}
          </Button>
          {Object.keys(TYPE_ICON).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={filterType === type ? "default" : "outline"}
              onClick={() => setFilterType(type)}
              className="h-7 text-[11px]"
            >
              {TYPE_ICON[type]} {t(`filter${type.charAt(0).toUpperCase() + type.slice(1)}`)}
            </Button>
          ))}
        </div>

        {/* Notifications Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
          {showSkeletons && filteredNotifications.length === 0 && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 p-3 border border-border rounded-lg">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-1/2 rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showSkeletons && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground/50">
              <Bell className="size-10 stroke-1 mb-2.5" />
              {search || filterType ? (
                <>
                  <p className="text-sm font-semibold">{t("noResultsTitle")}</p>
                  <p className="text-xs">{t("noResultsSubtitle")}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">{t("noNotificationsTitle")}</p>
                  <p className="text-xs">{t("noNotificationsSubtitle")}</p>
                </>
              )}
            </div>
          )}

          {(!showSkeletons || filteredNotifications.length > 0) &&
            filteredNotifications.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setSelectedId(n.id);
                  if (!n.isRead) {
                    markRead.mutate({ id: n.id });
                  }
                }}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                  selectedId === n.id
                    ? "bg-accent/40 border-primary"
                    : !n.isRead
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                      : "border-border hover:bg-muted/40",
                  "animate-fade-in-up",
                )}
                style={{
                  animationDelay: `${i * 30}ms`,
                  animationDuration: "200ms",
                }}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background border text-xs">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={cn(
                        "text-xs truncate block",
                        !n.isRead ? "font-bold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {n.titleKey}
                    </span>
                    {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                    {n.messageKey}
                  </p>
                  <time className="text-[9px] text-muted-foreground/50 block">
                    {formatDateTime(n.createdAt)}
                  </time>
                </div>
              </button>
            ))}

          {!showSkeletons &&
            data &&
            "total" in data &&
            typeof data.total === "number" &&
            data.total > perPage && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-primary hover:bg-primary/5 border border-dashed border-primary/20"
                  onClick={() => setPerPage((prev) => prev + 30)}
                >
                  {t("loadMoreBtn") || "Tải thêm"}
                </Button>
              </div>
            )}
        </div>
      </Card>

      {/* Right Pane: Notification Detail View (7 cols) */}
      <Card
        className={cn(
          "lg:col-span-7 flex flex-col p-6 space-y-6 border-border bg-card h-full",
          selectedId === null && "hidden lg:flex",
        )}
      >
        {selectedNotification ? (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden h-7 px-2 -ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="size-4 mr-0.5" />
                    {t("backBtn")}
                  </Button>
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 uppercase font-mono">
                    {getLocalizedType(selectedNotification.type, t)}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/60">
                    ID: {selectedNotification.id}
                  </span>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {selectedNotification.titleKey}
                </h2>
                <time className="text-xs text-muted-foreground/60 block">
                  Received on {formatDateTime(selectedNotification.createdAt)}
                </time>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  title={selectedNotification.isRead ? "Mark as unread" : "Mark as read"}
                  onClick={() =>
                    markRead.mutate({
                      id: selectedNotification.id,
                      read: !selectedNotification.isRead,
                    })
                  }
                  disabled={markRead.isPending}
                  className="h-8 px-2.5"
                >
                  {selectedNotification.isRead ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    askConfirm({
                      title: t("deleteConfirmTitle"),
                      message: t("deleteConfirmDesc"),
                      onConfirm: () => deleteNotification.mutate({ id: selectedNotification.id }),
                    })
                  }
                  disabled={deleteNotification.isPending}
                  className="h-8 px-2.5"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 space-y-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t("messageLabel")}
              </span>
              <div className="p-4 rounded-xl border border-border bg-muted/20 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {selectedNotification.messageKey}
              </div>

              {selectedNotification.link && (
                <div className="pt-2">
                  <Button size="sm" asChild>
                    <a href={selectedNotification.link} target="_blank" rel="noopener noreferrer">
                      {t("linkBtn")}
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {/* Debug parameters */}
            {selectedNotification.variables && (
              <div className="border-t border-border pt-4 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block">
                  {t("variablesLabel")}
                </span>
                <pre className="p-3 rounded-lg bg-black text-[10px] font-mono text-green-400 overflow-x-auto border border-zinc-800">
                  {JSON.stringify(selectedNotification.variables, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground/45 py-20">
            <Bell className="size-12 stroke-[0.8] mb-3 animate-pulse" />
            <p className="text-sm font-semibold">{t("selectNotification")}</p>
            <p className="text-xs">{t("selectNotificationDesc")}</p>
          </div>
        )}
      </Card>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
