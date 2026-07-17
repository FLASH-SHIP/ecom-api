"use client";

import { trpc } from "@customer/lib/trpc";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
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
import { AlertTriangle, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "../../../components/toast-provider";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: naturally complex dashboard orchestrator
export default function ApiKeysPage() {
  const { languageId: currentLocale } = useI18n();
  const { toast } = useToast();

  // API Key States
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyLabel, setApiKeyLabel] = useState("");
  const [allowedIpsInput, setAllowedIpsInput] = useState("");
  const [rawApiKeyResult, setRawApiKeyResult] = useState<string | null>(null);
  const [maskedKeyResult, setMaskedKeyResult] = useState<string | null>(null);
  const [expirationDays, setExpirationDays] = useState<string>("90");

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

  // Queries & Mutations
  const {
    data: apiKeys,
    isLoading: loadingKeys,
    refetch: refetchKeys,
  } = trpc.customer.apiKeys.list.useQuery();
  const createApiKeyMutation = trpc.customer.apiKeys.create.useMutation();
  const revokeApiKeyMutation = trpc.customer.apiKeys.revoke.useMutation();

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let expiresAt: Date | null = null;
      if (expirationDays !== "never") {
        const days = Number.parseInt(expirationDays, 10);
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }

      const allowedIps = allowedIpsInput
        .split(",")
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);

      const result = await createApiKeyMutation.mutateAsync({
        label: apiKeyLabel || "API Key",
        expiresAt,
        allowedIps: allowedIps.length > 0 ? allowedIps : null,
      });
      setRawApiKeyResult(result.rawKey);
      setMaskedKeyResult(result.maskedKey);
      setApiKeyLabel("");
      setAllowedIpsInput("");
      refetchKeys();
      toast(translate("developer.toastCreateKeySuccess", currentLocale), "success");
    } catch (err) {
      const error = err as { message?: string };
      toast(error.message || translate("developer.toastCreateKeyFailed", currentLocale), "error");
    }
  };

  const handleRevokeApiKey = (id: string) => {
    showConfirm(
      translate("developer.confirmTitle", currentLocale),
      translate("developer.revokeKeyConfirm", currentLocale),
      async () => {
        try {
          await revokeApiKeyMutation.mutateAsync({ id });
          refetchKeys();
          toast(translate("developer.toastRevokeKeySuccess", currentLocale), "success");
        } catch (err) {
          const error = err as { message?: string };
          toast(
            error.message || translate("developer.toastRevokeKeyFailed", currentLocale),
            "error",
          );
        }
      },
      true,
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
              {translate("developer.apiKeysTab", currentLocale)}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {translate("developer.apiKeysDesc", currentLocale)}
            </p>
          </div>
          <Button
            onClick={() => {
              setRawApiKeyResult(null);
              setMaskedKeyResult(null);
              setApiKeyModalOpen(true);
            }}
            className="bg-[#0F798C] hover:bg-[#0c6070] text-white flex items-center gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            {translate("developer.generateKey", currentLocale)}
          </Button>
        </div>

        <CardContent className="p-0">
          {loadingKeys ? (
            <div className="flex items-center justify-center p-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-[#0F798C]" />
              <span>{translate("developer.loadingKeys", currentLocale)}</span>
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <Table>
              <TableHeader className="bg-[#CCF2EB]/20 dark:bg-teal-950/20">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200 pl-6">
                    Label / Name
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    API Key Mask
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    {translate("developer.thAllowedIps", currentLocale)}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    Created At
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    Last Used
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200">
                    Expires At
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0c6070] dark:text-teal-200 text-right pr-6">
                    {translate("developer.thActions", currentLocale)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: tabular map rendering */}
                {apiKeys.map((key) => (
                  <TableRow key={key.id} className="border-b border-border">
                    <TableCell className="font-semibold text-slate-700 dark:text-slate-200 pl-6">
                      {key.label || "Unnamed Key"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {key.maskedKey}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {key.allowedIps && key.allowedIps.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {key.allowedIps.map((ip) => (
                            <span
                              key={ip}
                              className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border"
                            >
                              {ip}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/75 italic">
                          {translate("developer.ipAny", currentLocale)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(key.createdAt).toLocaleString(
                        currentLocale === "vi" ? "vi-VN" : "en-US",
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleString(
                            currentLocale === "vi" ? "vi-VN" : "en-US",
                          )
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString(
                            currentLocale === "vi" ? "vi-VN" : "en-US",
                          )
                        : "Never Expires"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeApiKey(key.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        title="Revoke Key"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
              <ShieldAlert className="size-10 text-muted-foreground/60" />
              <span className="text-sm font-semibold">
                {translate("developer.noKeysTitle", currentLocale)}
              </span>
              <span className="text-xs text-center max-w-sm">
                {translate("developer.noKeysDesc", currentLocale)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Generate API Key */}
      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent
          className={`max-w-md bg-card border border-border rounded-2xl z-[9999] ${
            rawApiKeyResult ? "[&>button[class*='absolute']]:hidden" : ""
          }`}
          onPointerDownOutside={(e) => {
            if (rawApiKeyResult) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (rawApiKeyResult) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{translate("developer.modalCreateKeyTitle", currentLocale)}</DialogTitle>
            <DialogDescription>
              {translate("developer.modalCreateKeyDesc", currentLocale)}
            </DialogDescription>
          </DialogHeader>

          {rawApiKeyResult ? (
            <div className="flex flex-col gap-4 mt-2">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-300 leading-normal">
                  {translate("developer.modalCreateKeyWarning", currentLocale)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{translate("developer.modalCreateKeyRaw", currentLocale)}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="raw-key-input"
                    value={rawApiKeyResult}
                    readOnly
                    className="font-mono text-xs select-all bg-muted border border-border rounded-lg"
                  />
                  <Button
                    type="button"
                    onClick={() => copyToClipboard(rawApiKeyResult)}
                    className="bg-[#0F798C] hover:bg-[#0c6070] text-white shrink-0 cursor-pointer"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-mono">
                Masked Key: {maskedKeyResult}
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => {
                    setApiKeyModalOpen(false);
                    setRawApiKeyResult(null);
                  }}
                  className="bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  {translate("developer.modalLogsClose", currentLocale)}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateApiKey} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="keyLabel">
                  {translate("developer.modalCreateKeyLabel", currentLocale)}
                </Label>
                <Input
                  id="keyLabel"
                  value={apiKeyLabel}
                  onChange={(e) => setApiKeyLabel(e.target.value)}
                  placeholder={translate("developer.modalCreateKeyPlaceholder", currentLocale)}
                  required
                  maxLength={50}
                  className="bg-card border border-border rounded-lg focus-visible:ring-[#0F798C] focus-visible:border-[#0F798C]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="keyExpiration">
                  {translate("developer.modalCreateKeyExpiration", currentLocale)}
                </Label>
                <select
                  id="keyExpiration"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  className="w-full h-10 border border-border rounded-lg bg-card text-foreground px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F798C]"
                >
                  <option value="30">{currentLocale === "vi" ? "30 ngày" : "30 days"}</option>
                  <option value="90">
                    {currentLocale === "vi" ? "90 ngày (Khuyến nghị)" : "90 days (Recommended)"}
                  </option>
                  <option value="180">{currentLocale === "vi" ? "180 ngày" : "180 days"}</option>
                  <option value="365">{currentLocale === "vi" ? "1 năm" : "1 year"}</option>
                  <option value="never">
                    {currentLocale === "vi"
                      ? "Không hết hạn (Không khuyến nghị)"
                      : "Never expires (Not recommended)"}
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="allowedIpsInput">
                  {translate("developer.modalCreateKeyAllowedIps", currentLocale)}
                </Label>
                <Input
                  id="allowedIpsInput"
                  value={allowedIpsInput}
                  onChange={(e) => setAllowedIpsInput(e.target.value)}
                  placeholder={translate(
                    "developer.modalCreateKeyAllowedIpsPlaceholder",
                    currentLocale,
                  )}
                  className="bg-card border border-border rounded-lg focus-visible:ring-[#0F798C] focus-visible:border-[#0F798C]"
                />
                <span className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  {translate("developer.modalCreateKeyAllowedIpsDesc", currentLocale)}
                </span>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApiKeyModalOpen(false)}
                  className="border-border hover:bg-accent/40 cursor-pointer"
                >
                  {translate("developer.cancel", currentLocale)}
                </Button>
                <Button
                  type="submit"
                  disabled={createApiKeyMutation.isPending}
                  className="bg-[#0F798C] hover:bg-[#0c6070] text-white cursor-pointer"
                >
                  {createApiKeyMutation.isPending
                    ? currentLocale === "vi"
                      ? "Đang tạo..."
                      : "Generating..."
                    : translate("developer.generateKey", currentLocale)}
                </Button>
              </div>
            </form>
          )}
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
