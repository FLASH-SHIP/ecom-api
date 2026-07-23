"use client";

import { showToast, ToastType } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { formatDateTime } from "@admin/utils/dateFormat";
import { Badge } from "@ecom/ui/components/badge";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import { DatePicker } from "@ecom/ui/components/date-picker";
import { Input } from "@ecom/ui/components/input";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Calendar, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function BroadcastTab() {
  const t = useTranslations("notifications");
  const utils = trpc.useUtils();

  // Form states
  const [targetType, setTargetType] = useState("ALL_CUSTOMERS");
  const [targetIdsText, setTargetIdsText] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [isScheduled, setIsScheduled] = useState(false);
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  // Queries
  const { data: scheduledList, isLoading } = trpc.viewer.notifications.listScheduled.useQuery({
    page: 1,
    perPage: 30,
  });

  const createBroadcast = trpc.viewer.notifications.createScheduled.useMutation({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, t("broadcastSuccess"));
      // Reset Form
      setTitle("");
      setMessage("");
      setLink("");
      setScheduledDate("");
      setScheduledTime("12:00");
      setIsScheduled(false);
      setTargetIdsText("");
      utils.viewer.notifications.listScheduled.invalidate();
    },
    onError: (err) => {
      showToast(ToastType.ERROR, `Failed: ${err.message}`);
    },
  });

  const deleteBroadcast = trpc.viewer.notifications.deleteScheduled.useMutation({
    onSuccess: () => {
      showToast(ToastType.SUCCESS, t("deleteSuccess"));
      utils.viewer.notifications.listScheduled.invalidate();
    },
    onError: (err) => {
      showToast(ToastType.ERROR, `Failed: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    let targetIds: string[] | undefined;
    if (targetIdsText.trim()) {
      targetIds = targetIdsText
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    }

    const scheduledAtDate =
      isScheduled && scheduledDate
        ? new Date(`${scheduledDate}T${scheduledTime || "00:00"}:00`)
        : new Date();

    createBroadcast.mutate({
      targetType,
      targetIds,
      title,
      message,
      link: link.trim() || null,
      scheduledAt: scheduledAtDate,
    });
  };

  const getStatusColor = (status: string) => {
    if (status === "PENDING")
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300";
    if (status === "PROCESSING")
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
    if (status === "SENT")
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300";
    return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300";
  };

  const getStatusTranslation = (status: string): string => {
    if (status === "PENDING") return t("statusPending");
    if (status === "PROCESSING") return t("statusProcessing");
    if (status === "SENT") return t("statusSent");
    return t("statusFailed");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
      {/* Left panel: Broadcast Composer Form (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-base font-bold text-foreground border-b border-border pb-3">
              {t("broadcast")}
            </h2>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label
                htmlFor="audience-select"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("targetType")}
              </label>
              <select
                id="audience-select"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL_CUSTOMERS">{t("allCustomers")}</option>
                <option value="ADMIN_USERS">{t("adminUsers")}</option>
                <option value="SPECIFIC_CUSTOMERS">{t("specificCustomers")}</option>
                <option value="SPECIFIC_USERS">{t("specificUsers")}</option>
              </select>
            </div>

            {(targetType === "SPECIFIC_CUSTOMERS" || targetType === "SPECIFIC_USERS") && (
              <div className="space-y-1.5 animate-fade-in-down">
                <label
                  htmlFor="target-ids-input"
                  className="text-xs font-semibold text-muted-foreground uppercase"
                >
                  {t("targetIdsLabel")}
                </label>
                <Input
                  id="target-ids-input"
                  value={targetIdsText}
                  onChange={(e) => setTargetIdsText(e.target.value)}
                  placeholder={t("targetIdsPlaceholder")}
                  className="h-10 text-sm"
                />
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="broadcast-title"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("titleInput")}
              </label>
              <Input
                id="broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter alert title..."
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label
                htmlFor="broadcast-msg"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("messageInput")}
              </label>
              <textarea
                id="broadcast-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose message alert..."
                required
                rows={4}
                className="w-full p-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Action Link */}
            <div className="space-y-1.5">
              <label
                htmlFor="broadcast-link"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {t("linkInput")}
              </label>
              <Input
                id="broadcast-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/orders/..."
                className="h-10 text-sm"
              />
            </div>

            {/* Scheduling toggles */}
            <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="schedule-checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="size-4 text-primary rounded border-input"
                />
                <label
                  htmlFor="schedule-checkbox"
                  className="text-xs font-semibold text-foreground uppercase cursor-pointer select-none"
                >
                  {t("scheduledAtInput")}
                </label>
              </div>

              {isScheduled && (
                <div className="flex items-center gap-2 animate-fade-in-down">
                  <DatePicker
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    placeholder={t("selectDate")}
                    className="h-10 text-sm w-44"
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required={isScheduled}
                    className="h-10 text-sm w-28"
                  />
                </div>
              )}
            </div>

            {/* Launch Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={createBroadcast.isPending}
                className="h-10 px-6 font-semibold gap-2"
              >
                {isScheduled ? (
                  <>
                    <Calendar className="size-4" />
                    {t("scheduleBtn")}
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    {t("sendNow")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* History table list */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">{t("campaignsListTitle")}</h3>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                  <th className="p-4">{t("tableTarget")}</th>
                  <th className="p-4">{t("tableMessage")}</th>
                  <th className="p-4 text-center">{t("tableTriggerDate")}</th>
                  <th className="p-4 text-center">{t("tableStatus")}</th>
                  <th className="p-4 text-center">{t("tableActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                )}

                {!isLoading && scheduledList?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground/60">
                      {t("noCampaigns")}
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  scheduledList?.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td
                        className="p-4 font-semibold text-primary truncate max-w-[120px]"
                        title={item.targetType}
                      >
                        {item.targetType}
                      </td>
                      <td className="p-4 max-w-[200px]">
                        <span className="font-bold text-foreground block truncate">
                          {item.title}
                        </span>
                        <span className="text-muted-foreground block truncate">{item.message}</span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap text-muted-foreground/80">
                        {formatDateTime(item.scheduledAt)}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          className={cn(
                            "text-[9px] font-bold px-2 py-0.5",
                            getStatusColor(item.status),
                          )}
                        >
                          {getStatusTranslation(item.status)}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        {item.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              askConfirm({
                                title: t("deleteConfirmTitle"),
                                message: t("deleteConfirmDesc"),
                                onConfirm: () => deleteBroadcast.mutate({ id: item.id }),
                              })
                            }
                            disabled={deleteBroadcast.isPending}
                            className="size-7 p-0"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Right panel: Phone Lockscreen Preview Mockup (5 cols) */}
      <div className="lg:col-span-5 flex flex-col justify-start items-center">
        <div className="sticky top-24 w-full max-w-[290px] flex flex-col items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            {t("livePreview")}
          </span>

          {/* Smartphone mockup shell */}
          <div className="relative w-[280px] h-[550px] rounded-[36px] border-[8px] border-slate-900 bg-slate-950 shadow-2xl flex flex-col overflow-hidden ring-4 ring-slate-800">
            {/* Dynamic island / speaker grill */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-2xl z-30 flex items-center justify-center">
              <span className="size-1.5 rounded-full bg-slate-900 absolute right-4" />
            </div>

            {/* Lockscreen background image (gradients for visual excellence) */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 z-10 flex flex-col items-center justify-between py-12 px-6">
              {/* Date & Time display */}
              <div className="text-center space-y-1 mt-6 text-white/90 z-20">
                <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">
                  Friday, July 17
                </span>
                <h1 className="text-4xl font-extralight tracking-tight">09:41</h1>
              </div>

              {/* Real-time Notification Banner container */}
              <div className="w-full space-y-3 z-20 mb-10 flex flex-col justify-end">
                {title.trim() || message.trim() ? (
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl space-y-1.5 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Fake App Logo */}
                        <div className="size-4.5 rounded bg-primary flex items-center justify-center text-[9px] font-black text-white">
                          E
                        </div>
                        <span className="text-[10px] font-bold text-white/80 uppercase">
                          Ecom CMS
                        </span>
                      </div>
                      <span className="text-[9px] text-white/40">now</span>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white leading-snug">
                        {title.trim() ? title : "Notification Alert"}
                      </h4>
                      <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3">
                        {message.trim()
                          ? message
                          : "Notification message details will render dynamically here..."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 border border-white/5 bg-white/5 rounded-2xl backdrop-blur-md">
                    <p className="text-[10px] text-white/50 italic leading-relaxed">
                      Please enter a title & message in the composer form to preview mock alert
                      banner.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom bar indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full z-30" />
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
