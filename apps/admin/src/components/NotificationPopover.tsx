"use client";

import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

const TYPE_ICON: Record<string, string> = {
  comment: "💬",
  contact: "📩",
  webhook: "🔗",
  manual: "📢",
};

export function NotificationPopover() {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: countData } = trpc.viewer.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: listData, isLoading } = trpc.viewer.notifications.list.useQuery(
    { page: 1, perPage: 5 },
    { enabled: open },
  );

  const invalidate = () => {
    utils.viewer.notifications.list.invalidate();
    utils.viewer.notifications.unreadCount.invalidate();
  };

  const markAllRead = trpc.viewer.notifications.markAllRead.useMutation({
    onSuccess: invalidate,
  });

  const notifications = listData?.items ?? [];
  const unreadCount = countData ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title={t("title")}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border bg-popover">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{t("title")}</span>
            {unreadCount > 0 && (
              <Badge className="h-4 px-1 rounded-full text-[9px] font-bold">
                {unreadCount} {t("newBadge").toLowerCase()}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 text-xs text-primary hover:bg-primary/10"
            >
              <CheckCheck className="mr-1 size-3.5" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        {/* Content list */}
        <div className="max-h-72 overflow-y-auto divide-y divide-border py-1">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold text-muted-foreground">
                {t("noNotificationsTitle")}
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                {t("noNotificationsSubtitle")}
              </p>
            </div>
          )}

          {!isLoading &&
            notifications.map((n, i) => (
              <Link
                key={n.id}
                href={n.link || "/notifications"}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                  !n.isRead && "bg-primary/5 hover:bg-primary/10",
                  "animate-fade-in-up",
                )}
                style={{
                  animationDelay: `${i * 40}ms`,
                  animationDuration: "250ms",
                }}
              >
                {/* Icon wrapper */}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background border border-border text-sm">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={cn(
                        "text-xs truncate",
                        n.isRead ? "text-muted-foreground" : "font-semibold text-foreground",
                      )}
                    >
                      {n.titleKey}
                    </p>
                    {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {n.messageKey}
                  </p>
                  <time className="text-[10px] text-muted-foreground/60 block pt-1">
                    {formatDateTime(n.createdAt)}
                  </time>
                </div>
              </Link>
            ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-2 text-center bg-muted/20">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold py-1.5 px-3 rounded-md transition-colors hover:bg-accent"
          >
            {t("viewAll") ?? "View all notifications"}
            <ExternalLink className="size-3 text-muted-foreground/60" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
