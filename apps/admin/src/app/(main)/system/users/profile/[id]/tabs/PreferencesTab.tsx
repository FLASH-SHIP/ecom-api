"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Label } from "@ecom/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { AlertCircle, CheckCircle2, Loader2, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const LOCALES = [
  { value: "vi", label: "Tiếng Việt - vi" },
  { value: "en", label: "English - en" },
];

interface PreferencesTabProps {
  userId: number;
  isSelf: boolean;
  isAdmin: boolean;
}

export function PreferencesTab({ userId, isSelf, isAdmin }: PreferencesTabProps) {
  const t = useTranslations("users.profile");
  const tc = useTranslations("users");
  const utils = trpc.useUtils();

  // Fetch preferences for the target user (admin can view/edit other users — like Botble)
  const { data: prefs, isLoading: prefsLoading } = trpc.viewer.auth.getPreferences.useQuery(
    { userId },
    { staleTime: 60_000 },
  );

  // Target user's profile data (for locale field)
  const { data: targetUser, isLoading: targetLoading } = trpc.viewer.auth.getUserProfile.useQuery(
    { userId },
    { staleTime: 30_000 },
  );

  const [locale, setLocale] = useState<string>("vi");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync state when data loads or refetches after save
  useEffect(() => {
    setLocale(targetUser?.locale ?? "vi");
  }, [targetUser?.locale]);

  useEffect(() => {
    setTheme(prefs?.theme ?? "light");
  }, [prefs?.theme]);

  // Locale is stored on the User model — use updateProfile
  const updateProfile = trpc.viewer.auth.updateProfile.useMutation({
    onSuccess: () => {
      void utils.viewer.auth.me.invalidate();
      void utils.viewer.auth.getUserProfile.invalidate({ userId });
    },
  });

  // Theme is stored in user_meta — use updatePreferences
  const updatePreferences = trpc.viewer.auth.updatePreferences.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      void utils.viewer.auth.getPreferences.invalidate({ userId });
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use Promise.allSettled so one failure doesn't block the other
    Promise.allSettled([
      // Only update locale when viewing own profile or admin editing another
      (isSelf || isAdmin) && updateProfile.mutateAsync({ userId, locale: locale as "en" | "vi" }),
      updatePreferences.mutateAsync({ userId, theme }),
    ]).then((results) => {
      const hasError = results.some((r) => r.status === "rejected");
      if (hasError) {
        const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
        setError(rejected.reason instanceof Error ? rejected.reason.message : t("errorOccurred"));
      }
    });
  };

  const isPending = updateProfile.isPending || updatePreferences.isPending;

  if (prefsLoading || targetLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h3 className="mb-6 text-lg font-semibold">{t("tabPreferences")}</h3>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {t("preferencesUpdateSuccess")}
          </span>
          <button type="button" onClick={() => setSuccess(false)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="max-w-md flex flex-col gap-6">
        {/* Locale select */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-locale">{t("language")}</Label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger id="pref-locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme radio */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("theme")}</legend>
          <div className="flex gap-4">
            <label
              htmlFor="pref-theme-light"
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                id="pref-theme-light"
                name="theme"
                value="light"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
                className="size-4 text-primary"
              />
              {t("themeLight")}
            </label>
            <label
              htmlFor="pref-theme-dark"
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                id="pref-theme-dark"
                name="theme"
                value="dark"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
                className="size-4 text-primary"
              />
              {t("themeDark")}
            </label>
          </div>
        </fieldset>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={isPending} id="pref-save-btn">
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {tc("actions.save")}
        </Button>
      </div>
    </form>
  );
}
