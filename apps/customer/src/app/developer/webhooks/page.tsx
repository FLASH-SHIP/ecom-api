"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Checkbox } from "@ecom/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ecom/ui/components/table";
import {
  Clock,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "../../../components/toast-provider";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: naturally complex dashboard orchestrator
export default function WebhooksPage() {
  const { languageId: currentLocale } = useI18n();
  const { toast } = useToast();

  // Webhook States
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookApiVersion, setWebhookApiVersion] = useState("2026-07-16");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);
  const [logDetailOpen, setLogDetailOpen] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<number, boolean>>({});

  const toggleRevealSecret = (id: number) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskSecret = (secret: string) => {
    if (!secret) return "";
    if (secret.length <= 10) return "••••••••";
    return `${secret.slice(0, 6)}••••••••${secret.slice(-4)}`;
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const showConfirm = (
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    isDanger = false,
  ) => {
    setConfirmConfig({
      isOpen: true,
      title,
      description,
      onConfirm: async () => {
        await onConfirm();
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      },
      isDanger,
    });
  };

  interface WebhookLogDetail {
    id: string | number;
    event: string;
    statusCode: number | null;
    createdAt: Date | string;
    payload: unknown;
    response: string | null;
  }

  const [activeLog, setActiveLog] = useState<WebhookLogDetail | null>(null);
  const [guideLang, setGuideLang] = useState<"nodejs" | "php" | "python">("nodejs");

  // Queries & Mutations
  const {
    data: webhooks,
    isLoading: loadingWebhooks,
    refetch: refetchWebhooks,
  } = trpc.customer.webhooks.list.useQuery();
  const createWebhookMutation = trpc.customer.webhooks.create.useMutation();
  const deleteWebhookMutation = trpc.customer.webhooks.delete.useMutation();
  const rollSecretMutation = trpc.customer.webhooks.rollSecret.useMutation();
  const testWebhookMutation = trpc.customer.webhooks.testWebhook.useMutation();

  // Webhook Logs Query
  const {
    data: webhookLogs,
    isLoading: loadingLogs,
    refetch: refetchLogs,
  } = trpc.customer.webhooks.listLogs.useQuery(
    { webhookId: selectedWebhookId ?? 0 },
    { enabled: !!selectedWebhookId && logsModalOpen },
  );

  const availableEvents = [
    "ping",
    "order.created",
    "order.status_updated",
    "order.checkpoint_added",
  ];

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEvents.length === 0) {
      toast(translate("developer.toastSelectEvent", currentLocale), "error");
      return;
    }
    try {
      await createWebhookMutation.mutateAsync({
        name: webhookName,
        url: webhookUrl,
        events: selectedEvents,
        apiVersion: webhookApiVersion,
      });
      setWebhookName("");
      setWebhookUrl("");
      setSelectedEvents([]);
      setWebhookModalOpen(false);
      refetchWebhooks();
      toast(translate("developer.toastCreateWebhookSuccess", currentLocale), "success");
    } catch (err) {
      const error = err as { message?: string };
      toast(
        error.message || translate("developer.toastCreateWebhookFailed", currentLocale),
        "error",
      );
    }
  };

  const handleDeleteWebhook = (id: number) => {
    showConfirm(
      translate("developer.confirmTitle", currentLocale),
      translate("developer.deleteWebhookConfirm", currentLocale),
      async () => {
        try {
          await deleteWebhookMutation.mutateAsync({ id });
          refetchWebhooks();
          toast(translate("developer.toastDeleteWebhookSuccess", currentLocale), "success");
        } catch (err) {
          const error = err as { message?: string };
          toast(
            error.message || translate("developer.toastDeleteWebhookFailed", currentLocale),
            "error",
          );
        }
      },
      true,
    );
  };

  const handleRollSecret = (id: number) => {
    showConfirm(
      translate("developer.confirmTitle", currentLocale),
      translate("developer.rotateSecretConfirm", currentLocale),
      async () => {
        try {
          const result = await rollSecretMutation.mutateAsync({ id });
          refetchWebhooks();
          toast(
            `${translate("developer.toastRotateSecretSuccess", currentLocale)} Secret: ${result.secret}`,
            "success",
          );
        } catch (err) {
          const error = err as { message?: string };
          toast(
            error.message || translate("developer.toastRotateSecretFailed", currentLocale),
            "error",
          );
        }
      },
      false,
    );
  };

  const handleTestWebhook = async (id: number) => {
    try {
      await testWebhookMutation.mutateAsync({ id });
      toast(translate("developer.toastPingSuccess", currentLocale), "success");
    } catch (err) {
      const error = err as { message?: string };
      toast(error.message || translate("developer.toastPingFailed", currentLocale), "error");
    }
  };

  const handleToggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast(translate("developer.toastCopied", currentLocale), "success");
  };

  return (
    <>
      <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 flex items-center justify-between border-b border-border bg-[#CCF2EB]/10 dark:bg-teal-950/10">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {translate("developer.webhooksTab", currentLocale)}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {translate("developer.webhooksDesc", currentLocale)}
            </p>
          </div>
          <Button
            onClick={() => setWebhookModalOpen(true)}
            className="bg-[#0F798C] hover:bg-[#0c6070] text-white flex items-center gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            {translate("developer.addWebhook", currentLocale)}
          </Button>
        </div>

        <CardContent className="p-0">
          {loadingWebhooks ? (
            <div className="flex items-center justify-center p-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-[#0F798C]" />
              <span>{translate("developer.loadingWebhooks", currentLocale)}</span>
            </div>
          ) : webhooks && webhooks.length > 0 ? (
            <Table>
              <TableHeader className="bg-[#CCF2EB]/20 dark:bg-teal-950/20">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200 pl-6">
                    {translate("developer.thWebhookName", currentLocale)}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    Endpoint URL
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    {translate("developer.thEvents", currentLocale)}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    API Version
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    Secret Key
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200 text-center">
                    {translate("developer.thStatus", currentLocale)}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200 text-right pr-6">
                    {translate("developer.thActions", currentLocale)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: tabular map rendering */}
                {webhooks.map((wh) => (
                  <TableRow key={wh.id} className="border-b border-border">
                    <TableCell className="font-semibold text-slate-700 dark:text-slate-200 pl-6">
                      {wh.name}
                    </TableCell>
                    <TableCell
                      className="max-w-[180px] truncate text-xs font-mono text-[#0F798C]"
                      title={wh.url}
                    >
                      {wh.url}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((ev) => (
                          <span
                            key={ev}
                            className="px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-[10px] text-[#0F798C] dark:text-cyan-300 font-semibold"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{wh.apiVersion}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {wh.secret ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {revealedSecrets[wh.id] ? wh.secret : maskSecret(wh.secret)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealSecret(wh.id)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title={revealedSecrets[wh.id] ? "Hide" : "Show"}
                          >
                            {revealedSecrets[wh.id] ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(wh.secret || "")}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Copy Secret"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      ) : (
                        "No secret"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          wh.isActive
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {wh.isActive
                          ? translate("developer.active", currentLocale)
                          : translate("developer.inactive", currentLocale)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedWebhookId(wh.id);
                            setLogsModalOpen(true);
                          }}
                          className="text-[#0F798C] hover:bg-[#CCF2EB]/20 cursor-pointer"
                          title={translate("developer.logs", currentLocale)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTestWebhook(wh.id)}
                          className="text-teal-600 hover:bg-[#CCF2EB]/20 cursor-pointer"
                          title={translate("developer.sendPing", currentLocale)}
                        >
                          <Send className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRollSecret(wh.id)}
                          className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
                          title={translate("developer.rotateSecretBtn", currentLocale)}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                          title={translate("developer.delete", currentLocale)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <Webhook className="size-10 text-muted-foreground/60" />
              <span className="text-sm font-semibold">
                {translate("developer.noWebhooksTitle", currentLocale)}
              </span>
              <span className="text-xs text-center max-w-sm">
                {translate("developer.noWebhooksDesc", currentLocale)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm mt-6">
        <div className="p-5 border-b border-border bg-[#CCF2EB]/10 dark:bg-teal-950/10">
          <h2 className="text-lg font-bold text-foreground">
            {translate("developer.sigVerifyTitle", currentLocale)}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {translate("developer.sigVerifyDesc", currentLocale)}
          </p>
        </div>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>{translate("developer.sigVerifyHeaders", currentLocale)}</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
              <li>
                <strong>X-Webhook-Timestamp</strong>:{" "}
                {currentLocale === "vi"
                  ? "Thời gian gửi webhook (ISO format)."
                  : "The timestamp of the webhook event (ISO format)."}
              </li>
              <li>
                <strong>X-Webhook-Signature</strong>:{" "}
                {currentLocale === "vi"
                  ? "Chữ ký HMAC SHA-256 được tính từ chuỗi: timestamp + '.' + body_gói_tin"
                  : "The HMAC SHA-256 signature computed from: timestamp + '.' + raw_body"}
              </li>
              <li>
                <strong>X-Webhook-Signature-Legacy</strong>:{" "}
                {currentLocale === "vi"
                  ? "Chữ ký HMAC SHA-256 được ký bằng khóa bí mật cũ (chỉ xuất hiện trong vòng 15 phút sau khi xoay vòng khóa bí mật)."
                  : "The HMAC SHA-256 signature computed using the previous secret key (only present during the 15-minute rotation grace period)."}
              </li>
            </ul>
          </div>

          <div className="flex gap-2 bg-muted/30 p-1 rounded-lg self-start border border-border">
            {(["nodejs", "php", "python"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setGuideLang(lang)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  guideLang === lang
                    ? "bg-white dark:bg-zinc-800 text-[#0c6070] dark:text-teal-200 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "nodejs" ? "Node.js (Express)" : lang === "php" ? "PHP" : "Python"}
              </button>
            ))}
          </div>

          <div className="relative">
            {guideLang === "nodejs" && (
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono rounded-xl overflow-x-auto">
                {`const crypto = require('crypto');

function verifyWebhook(rawBody, timestamp, signature, secret, legacySignature, oldSecret) {
  // ${currentLocale === "vi" ? "1. So sánh chữ ký chính" : "1. Verify primary signature"}
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  const mainValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
  if (mainValid) return true;

  // ${currentLocale === "vi" ? "2. So sánh chữ ký cũ nếu đang trong thời gian grace period xoay khóa" : "2. Verify legacy signature if within key rotation grace period"}
  if (legacySignature && oldSecret) {
    const computedLegacy = crypto
      .createHmac('sha256', oldSecret)
      .update(\`\${timestamp}.\${rawBody}\`)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(legacySignature),
      Buffer.from(computedLegacy)
    );
  }

  return false;
}`}
              </pre>
            )}

            {guideLang === "php" && (
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono rounded-xl overflow-x-auto">
                {`<?php

function verifyWebhook($rawBody, $timestamp, $signature, $secret, $legacySignature = null, $oldSecret = null) {
    // ${currentLocale === "vi" ? "1. So sánh chữ ký chính" : "1. Verify primary signature"}
    $computedSignature = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
    if (hash_equals($signature, $computedSignature)) {
        return true;
    }

    // ${currentLocale === "vi" ? "2. So sánh chữ ký cũ trong thời gian grace period xoay khóa" : "2. Verify legacy signature within grace period"}
    if ($legacySignature && $oldSecret) {
        $computedLegacy = hash_hmac('sha256', $timestamp . '.' . $rawBody, $oldSecret);
        return hash_equals($legacySignature, $computedLegacy);
    }

    return false;
}`}
              </pre>
            )}

            {guideLang === "python" && (
              <pre className="p-4 bg-slate-900 text-slate-100 text-xs font-mono rounded-xl overflow-x-auto">
                {`import hmac
import hashlib

def verify_webhook(raw_body, timestamp, signature, secret, legacy_signature=None, old_secret=None):
    message = f"{timestamp}.{raw_body}".encode('utf-8')
    
    # ${currentLocale === "vi" ? "1. So sánh chữ ký chính" : "1. Verify primary signature"}
    computed_signature = hmac.new(
        secret.encode('utf-8'),
        message,
        hashlib.sha256
    ).hexdigest()

    if hmac.compare_digest(signature, computed_signature):
        return True

    # ${currentLocale === "vi" ? "2. So sánh chữ ký cũ" : "2. Verify legacy signature"}
    if legacy_signature and old_secret:
        computed_legacy = hmac.new(
            old_secret.encode('utf-8'),
            message,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(legacy_signature, computed_legacy)

    return False`}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Register Webhook */}
      <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
        <DialogContent className="max-w-lg bg-card border border-border rounded-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle>{translate("developer.modalAddWebhookTitle", currentLocale)}</DialogTitle>
            <DialogDescription>
              {translate("developer.modalAddWebhookDesc", currentLocale)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWebhook} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whName">
                {translate("developer.modalAddWebhookName", currentLocale)}
              </Label>
              <Input
                id="whName"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
                placeholder={translate("developer.modalAddWebhookNamePlaceholder", currentLocale)}
                required
                maxLength={50}
                className="bg-card border border-border rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whUrl">
                {translate("developer.modalAddWebhookUrl", currentLocale)}
              </Label>
              <Input
                id="whUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={translate("developer.modalAddWebhookUrlPlaceholder", currentLocale)}
                required
                type="url"
                className="bg-card border border-border rounded-lg"
              />
              <span className="text-[10px] text-muted-foreground leading-normal mt-0.5 block">
                {currentLocale === "vi"
                  ? "Phải là một HTTPS URL hợp lệ. Để bảo mật SSRF, máy chủ sẽ không follow HTTP Redirects (3xx)."
                  : "Must be a valid HTTPS URL. For SSRF security, the server will not follow HTTP Redirects (3xx)."}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whVersion">API Version (Payload Format)</Label>
              <select
                id="whVersion"
                value={webhookApiVersion}
                onChange={(e) => setWebhookApiVersion(e.target.value)}
                className="w-full h-10 border border-border rounded-lg bg-card text-foreground px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F798C]"
              >
                <option value="2026-07-16">2026-07-16 (Mới nhất - Thin Payload)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{translate("developer.modalAddWebhookEvents", currentLocale)}</Label>
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border border-border bg-[#CCF2EB]/5">
                {availableEvents.map((ev) => (
                  <div key={ev} className="flex items-center gap-2">
                    <Checkbox
                      id={`chk-${ev}`}
                      checked={selectedEvents.includes(ev)}
                      onCheckedChange={() => handleToggleEvent(ev)}
                    />
                    <label
                      htmlFor={`chk-${ev}`}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      {ev}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWebhookModalOpen(false)}
                className="border-border hover:bg-accent/40 cursor-pointer"
              >
                {translate("developer.cancel", currentLocale)}
              </Button>
              <Button
                type="submit"
                disabled={createWebhookMutation.isPending}
                className="bg-[#0F798C] hover:bg-[#0c6070] text-white cursor-pointer"
              >
                {createWebhookMutation.isPending
                  ? currentLocale === "vi"
                    ? "Đang lưu..."
                    : "Saving..."
                  : translate("developer.addWebhook", currentLocale)}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Webhook Delivery Logs */}
      <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
        <DialogContent className="max-w-4xl bg-card border border-border rounded-2xl z-[9999] h-[550px] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {translate("developer.modalLogsTitle", currentLocale).replace("{name}", "")}
            </DialogTitle>
            <DialogDescription>
              {currentLocale === "vi"
                ? "Xem nhật ký 50 lần truyền tin gần nhất để hỗ trợ kiểm thử và fix lỗi."
                : "View the 50 most recent delivery logs to support testing and debugging."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto mt-4 border border-border rounded-xl">
            {loadingLogs ? (
              <div className="flex items-center justify-center p-20 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-[#0F798C]" />
                <span>
                  {currentLocale === "vi"
                    ? "Đang tải nhật ký webhook..."
                    : "Loading webhook logs..."}
                </span>
              </div>
            ) : webhookLogs && webhookLogs.length > 0 ? (
              <Table>
                <TableHeader className="bg-[#CCF2EB]/15 dark:bg-teal-950/15">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070] pl-4">
                      {translate("developer.modalLogsEvent", currentLocale)}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070] text-center">
                      {translate("developer.modalLogsStatus", currentLocale)} (HTTP)
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070] text-center">
                      {currentLocale === "vi" ? "Kết quả" : "Result"}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070] text-center">
                      {translate("developer.modalLogsAttempts", currentLocale)}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070]">
                      {translate("developer.modalLogsError", currentLocale)}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070]">
                      {translate("developer.modalLogsTime", currentLocale)}
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0c6070] text-right pr-4">
                      {currentLocale === "vi" ? "Chi tiết" : "Details"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: tabular log map rendering */}
                  {webhookLogs.map((logItem) => (
                    <TableRow key={logItem.id} className="border-b border-border">
                      <TableCell className="font-semibold text-slate-700 dark:text-slate-200 pl-4">
                        {logItem.event}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold">
                        {logItem.statusCode ? (
                          <span
                            className={
                              logItem.statusCode >= 200 && logItem.statusCode < 300
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {logItem.statusCode}
                          </span>
                        ) : (
                          <span className="text-rose-500">Failed</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            logItem.success
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {logItem.success ? "SUCCESS" : "FAILED"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {logItem.attempts}
                      </TableCell>
                      <TableCell
                        className="text-xs text-rose-500 max-w-[180px] truncate"
                        title={logItem.error || ""}
                      >
                        {logItem.error || "-"}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {new Date(logItem.createdAt).toLocaleString(
                          currentLocale === "vi" ? "vi-VN" : "en-US",
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveLog(logItem);
                            setLogDetailOpen(true);
                          }}
                          className="text-[#0F798C] hover:bg-[#CCF2EB]/20 text-xs font-semibold cursor-pointer h-7"
                        >
                          {currentLocale === "vi" ? "Xem gói tin" : "View Payload"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-2">
                <Clock className="size-8 text-muted-foreground/60" />
                <span className="text-xs">
                  {translate("developer.modalLogsNoLogs", currentLocale)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4 shrink-0">
            <Button
              onClick={() => {
                refetchLogs();
                toast(
                  currentLocale === "vi" ? "Đã làm mới danh sách logs" : "Logs refreshed",
                  "success",
                );
              }}
              variant="outline"
              className="border-border cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              {currentLocale === "vi" ? "Làm mới (Refresh)" : "Refresh"}
            </Button>
            <Button
              onClick={() => setLogsModalOpen(false)}
              className="bg-[#0F798C] hover:bg-[#0c6070] text-white cursor-pointer"
            >
              {translate("developer.modalLogsClose", currentLocale)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Webhook Log Packet Details */}
      <Dialog open={logDetailOpen} onOpenChange={setLogDetailOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border rounded-2xl z-[9999] h-[480px] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Webhook Log Details</DialogTitle>
          </DialogHeader>

          {activeLog && (
            <div className="flex-1 min-h-0 flex flex-col gap-4 mt-2 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-xs border border-border rounded-lg p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground">ID Event:</span>{" "}
                  <span className="font-mono font-semibold">{activeLog.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Event Name:</span>{" "}
                  <span className="font-semibold text-sys-primary">{activeLog.event}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">HTTP Status:</span>{" "}
                  <span className="font-bold">{activeLog.statusCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {currentLocale === "vi" ? "Gửi lúc:" : "Sent at:"}
                  </span>{" "}
                  <span>
                    {new Date(activeLog.createdAt).toLocaleString(
                      currentLocale === "vi" ? "vi-VN" : "en-US",
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>
                  {currentLocale === "vi"
                    ? "Event Payload (Mã hóa che PII)"
                    : "Event Payload (PII Masked)"}
                </Label>
                <pre className="p-3 bg-slate-900 text-slate-100 text-[10px] font-mono rounded-lg overflow-x-auto max-h-[120px]">
                  {activeLog.payload ? JSON.stringify(activeLog.payload, null, 2) : "Null"}
                </pre>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Server Response Body</Label>
                <pre className="p-3 bg-slate-900 text-slate-100 text-[10px] font-mono rounded-lg overflow-x-auto max-h-[120px]">
                  {activeLog.response ? activeLog.response : "Null / No response"}
                </pre>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4 shrink-0">
            <Button
              onClick={() => setLogDetailOpen(false)}
              className="bg-[#0F798C] hover:bg-[#0c6070] text-white cursor-pointer"
            >
              {translate("developer.modalLogsClose", currentLocale)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Custom Confirmation Dialog */}
      <Dialog
        open={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-md bg-card border border-border rounded-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle
              className={
                confirmConfig.isDanger
                  ? "text-rose-600 dark:text-rose-400 font-bold"
                  : "text-amber-500 dark:text-amber-400 font-bold"
              }
            >
              {confirmConfig.title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {confirmConfig.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={confirmConfig.onConfirm}
              className={`flex-1 text-white font-semibold py-2.5 rounded-lg cursor-pointer shadow-sm ${
                confirmConfig.isDanger
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {translate("developer.confirmConfirm", currentLocale)}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
              className="flex-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground font-semibold py-2.5 rounded-lg cursor-pointer"
            >
              {translate("developer.confirmCancel", currentLocale)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
