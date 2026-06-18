"use client";

import { useToast } from "@admin/components/toast-provider";
import { ConfirmDialog } from "@admin/components/ui/ConfirmDialog";
import { useConfirm } from "@admin/components/ui/useConfirm";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ecom/ui/components/card";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface SettingGroupDef {
  labelKey: string;
  keys: { key: string; labelKey: string; placeholder: string }[];
}

const SETTING_GROUPS: SettingGroupDef[] = [
  {
    labelKey: "general",
    keys: [
      { key: "site_name", labelKey: "fields.siteName", placeholder: "My CMS" },
      {
        key: "site_description",
        labelKey: "fields.siteDescription",
        placeholder: "A brief description",
      },
      { key: "site_url", labelKey: "fields.siteUrl", placeholder: "https://example.com" },
      { key: "admin_email", labelKey: "fields.adminEmail", placeholder: "admin@example.com" },
    ],
  },
  {
    labelKey: "content",
    keys: [
      { key: "posts_per_page", labelKey: "fields.postsPerPage", placeholder: "10" },
      { key: "default_post_status", labelKey: "fields.defaultPostStatus", placeholder: "draft" },
      { key: "date_format", labelKey: "fields.dateFormat", placeholder: "dd-MM-yyyy" },
      { key: "time_format", labelKey: "fields.timeFormat", placeholder: "HH:mm" },
    ],
  },
  {
    labelKey: "seo",
    keys: [
      { key: "meta_title_suffix", labelKey: "fields.titleSuffix", placeholder: "| My Site" },
      { key: "meta_description", labelKey: "fields.defaultMetaDescription", placeholder: "..." },
      {
        key: "google_analytics_id",
        labelKey: "fields.googleAnalyticsId",
        placeholder: "G-XXXXXXX",
      },
    ],
  },
];

const ALL_KEYS = SETTING_GROUPS.flatMap((g) => g.keys.map((k) => k.key));

export default function GeneralSettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const { toast } = useToast();
  const { askConfirm, dialogProps: confirmDialogProps } = useConfirm();

  const { data: settings, isLoading } = trpc.viewer.settings.getMany.useQuery({ keys: ALL_KEYS });
  const { data: allSettings } = trpc.viewer.settings.getAll.useQuery();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!settings) return;
    const vals: Record<string, string> = {};
    for (const [k, v] of Object.entries(settings)) {
      vals[k] = v ?? "";
    }
    setLocalValues(vals);
    setDirty(new Set());
  }, [settings]);

  const bulkSetMut = trpc.viewer.settings.bulkSet.useMutation({
    onSuccess: () => {
      toast(t("saved"), "success");
      utils.viewer.settings.getMany.invalidate();
      utils.viewer.settings.getAll.invalidate();
      setDirty(new Set());
    },
    onError: (err) => toast(err.message, "error"),
  });

  const setMut = trpc.viewer.settings.set.useMutation({
    onSuccess: () => {
      toast(t("added"), "success");
      utils.viewer.settings.getMany.invalidate();
      utils.viewer.settings.getAll.invalidate();
      setShowAddCustom(false);
      setCustomKey("");
      setCustomValue("");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const removeMut = trpc.viewer.settings.remove.useMutation({
    onSuccess: () => {
      utils.viewer.settings.getAll.invalidate();
      utils.viewer.settings.getMany.invalidate();
    },
  });

  function handleChange(key: string, value: string) {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => new Set(prev).add(key));
  }

  function handleSave() {
    const items = Array.from(dirty).map((key) => ({ key, value: localValues[key] ?? "" }));
    if (items.length > 0) bulkSetMut.mutate({ items });
  }

  const customSettings = allSettings
    ? Object.entries(allSettings).filter(([k]) => !ALL_KEYS.includes(k))
    : [];

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading array — items have no stable IDs
          <Skeleton key={i} className="h-[200px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("general")}</h1>
        <Button onClick={handleSave} disabled={dirty.size === 0 || bulkSetMut.isPending}>
          {bulkSetMut.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {bulkSetMut.isPending
            ? t("saving")
            : dirty.size > 0
              ? t("saveChangesCount", { count: String(dirty.size) })
              : t("saveChanges")}
        </Button>
      </div>

      {bulkSetMut.error && (
        <div className="rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          {bulkSetMut.error.message}
        </div>
      )}

      {/* Setting Groups */}
      {SETTING_GROUPS.map((group) => (
        <Card key={group.labelKey}>
          <CardHeader className="border-b border-border px-6 py-4">
            <CardTitle className="text-base font-semibold">{t(group.labelKey)}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {group.keys.map((setting) => (
              <div key={setting.key} className="flex items-center gap-6 px-6 py-4">
                <div className="w-[200px] shrink-0">
                  <Label htmlFor={`setting-${setting.key}`} className="font-medium">
                    {t(setting.labelKey)}
                  </Label>
                  <code className="block text-xs text-muted-foreground">{setting.key}</code>
                </div>
                <Input
                  id={`setting-${setting.key}`}
                  value={localValues[setting.key] ?? ""}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                  placeholder={setting.placeholder}
                  className={cn(dirty.has(setting.key) && "border-primary")}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Custom Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4">
          <CardTitle className="text-base font-semibold">{t("customSettings")}</CardTitle>
          <Button
            variant={showAddCustom ? "outline" : "ghost"}
            size="sm"
            onClick={() => setShowAddCustom(!showAddCustom)}
          >
            {showAddCustom ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {showAddCustom ? tc("cancel") : t("add")}
          </Button>
        </CardHeader>

        {showAddCustom && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customKey.trim()) return;
              setMut.mutate({ key: customKey.trim(), value: customValue || null });
            }}
          >
            <div className="flex items-end gap-4 border-b border-border px-6 py-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="custom-key">{t("fields.key")} *</Label>
                <Input
                  id="custom-key"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="custom-value">{t("fields.value")}</Label>
                <Input
                  id="custom-value"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" disabled={setMut.isPending || !customKey.trim()}>
                {setMut.isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        )}

        {customSettings.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t("noCustomSettings")}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {customSettings.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between px-6 py-3">
                <div>
                  <code className="text-sm font-medium">{key}</code>
                  <p className="text-xs text-muted-foreground">{value ?? <em>null</em>}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label={t("deleteSettingLabel", { key })}
                  onClick={() => {
                    askConfirm({
                      message: t("deleteSettingConfirm", { key }),
                      onConfirm: () => removeMut.mutate({ key }),
                    });
                  }}
                  disabled={removeMut.isPending}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
