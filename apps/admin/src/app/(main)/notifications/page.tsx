"use client";

import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { Skeleton } from "@ecom/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import { Bell, Check, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

const TYPE_ICON: Record<string, string> = {
  comment: "💬",
  contact: "📩",
  webhook: "🔗",
};

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.viewer.notifications.list.useQuery({
    page: 1,
    perPage: 50,
  });

  const invalidate = () => {
    utils.viewer.notifications.list.invalidate();
    utils.viewer.notifications.unreadCount.invalidate();
  };

  const markRead = trpc.viewer.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markAllRead = trpc.viewer.notifications.markAllRead.useMutation({ onSuccess: invalidate });
  const deleteNotification = trpc.viewer.notifications.delete.useMutation({
    onSuccess: invalidate,
  });

  const notifications = data?.items ?? [];
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                {t("unread", { count: unreadCount })}
                <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
                  {unreadCount}
                </Badge>
              </span>
            ) : (
              t("allRead")
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 size-4" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <Bell size={56} className="mb-3 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">{t("noNotificationsTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground/60">{t("noNotificationsSubtitle")}</p>
        </Card>
      )}

      {/* Notification list */}
      {notifications.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "group p-4 transition-all",
                !n.isRead && "border-primary/30 bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-base leading-none">{TYPE_ICON[n.type] ?? "🔔"}</span>
                    <p
                      className={cn(
                        "flex-1 truncate text-sm",
                        n.isRead ? "text-muted-foreground" : "font-semibold text-foreground",
                      )}
                    >
                      {n.titleKey}
                    </p>
                    {!n.isRead && (
                      <Badge className="h-[18px] px-1.5 text-[10px] font-bold">
                        {t("newBadge")}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-1 text-sm text-muted-foreground">{n.messageKey}</p>
                  <time className="text-xs text-muted-foreground/60">
                    {formatDateTime(n.createdAt)}
                  </time>
                </div>

                {/* Actions */}
                <TooltipProvider>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.isRead && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                            aria-label={t("tooltips.markRead")}
                            onClick={() => markRead.mutate({ id: n.id })}
                            disabled={markRead.isPending}
                          >
                            <Check size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{t("tooltips.markRead")}</TooltipContent>
                      </Tooltip>
                    )}
                    {n.link && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={n.link}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                            aria-label={t("tooltips.viewDetail")}
                          >
                            <ExternalLink size={16} />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>{t("tooltips.viewDetail")}</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          aria-label={t("tooltips.delete")}
                          onClick={() => deleteNotification.mutate({ id: n.id })}
                          disabled={deleteNotification.isPending}
                        >
                          <Trash2 size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t("tooltips.delete")}</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
