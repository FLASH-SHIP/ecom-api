"use client";

import { useToast } from "@admin/components/toast-provider";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface LanguageFormDrawerProps {
  open: boolean;
  languageId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form drawer with create/edit modes, world language picker, and multiple form fields
export function LanguageFormDrawer({
  open,
  languageId,
  onClose,
  onSaved,
}: LanguageFormDrawerProps) {
  const t = useTranslations("languages");
  const isCreate = languageId === null;
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    locale: "",
    code: "",
    flag: "",
    isRtl: false,
    order: 0,
  });

  const { data: existingLang, isLoading: loadingLang } = trpc.viewer.languages.getById.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: enabled guard below
    { id: languageId! },
    { enabled: !isCreate && !!languageId },
  );

  const { data: worldLanguages } = trpc.viewer.languages.worldLanguages.useQuery();
  const { data: languages } = trpc.viewer.languages.list.useQuery();

  useEffect(() => {
    if (existingLang) {
      setFormData({
        name: existingLang.name,
        locale: existingLang.locale,
        code: existingLang.code,
        flag: existingLang.flag ?? "",
        isRtl: existingLang.isRtl,
        order: existingLang.order,
      });
    }
  }, [existingLang]);

  useEffect(() => {
    if (open && isCreate) {
      setFormData({ name: "", locale: "", code: "", flag: "", isRtl: false, order: 0 });
    }
  }, [open, isCreate]);

  const createMut = trpc.viewer.languages.create.useMutation({
    onSuccess: () => {
      toast(t("created"), "success");
      utils.viewer.languages.list.invalidate();
      onSaved();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const updateMut = trpc.viewer.languages.update.useMutation({
    onSuccess: () => {
      toast(t("updated"), "success");
      utils.viewer.languages.list.invalidate();
      onSaved();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const error = createMut.error ?? updateMut.error;

  const handleWorldLanguageSelect = useCallback(
    (locale: string) => {
      const lang = worldLanguages?.find((l) => l.locale === locale);
      if (lang) {
        setFormData({
          name: lang.name,
          locale: lang.locale,
          code: lang.code,
          flag: lang.flag ?? "",
          isRtl: "isRtl" in lang ? Boolean(lang.isRtl) : false,
          order: languages?.length ?? 0,
        });
      }
    },
    [worldLanguages, languages],
  );

  function handleSave() {
    if (!formData.name.trim() || !formData.locale.trim()) return;

    if (isCreate) {
      createMut.mutate(formData);
    } else if (languageId) {
      updateMut.mutate({ id: languageId, ...formData });
    }
  }

  const availableWorldLanguages = worldLanguages?.filter(
    (wl) => !languages?.some((l) => l.locale === wl.locale),
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{isCreate ? t("addLanguage") : t("editLanguage")}</SheetTitle>
        </SheetHeader>

        {!isCreate && loadingLang ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PerfectScroll className="flex flex-1 flex-col px-6 py-6">
            <div className="flex flex-col gap-5">
              {/* Predefined language picker */}
              {isCreate && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t("selectLanguage")}</Label>
                  <Select onValueChange={handleWorldLanguageSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectLanguage")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWorldLanguages?.map((wl) => (
                        <SelectItem key={wl.locale} value={wl.locale}>
                          {wl.name} ({wl.locale})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("selectLanguageHelper")}</p>
                </div>
              )}

              {/* Language name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lang-name">{t("name")} *</Label>
                <Input
                  id="lang-name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="English"
                />
                <p className="text-xs text-muted-foreground">{t("nameHelper")}</p>
              </div>

              {/* Locale */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lang-locale">{t("locale")} *</Label>
                <Input
                  id="lang-locale"
                  value={formData.locale}
                  onChange={(e) => setFormData((p) => ({ ...p, locale: e.target.value }))}
                  required
                  placeholder="en"
                  disabled={!isCreate}
                />
                <p className="text-xs text-muted-foreground">{t("localeHelper")}</p>
              </div>

              {/* Code */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lang-code">{t("code")} *</Label>
                <Input
                  id="lang-code"
                  value={formData.code}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                  required
                  placeholder="en_US"
                  disabled={!isCreate}
                />
                <p className="text-xs text-muted-foreground">{t("codeHelper")}</p>
              </div>

              {/* Text direction */}
              <div className="flex flex-col gap-1.5">
                <Label>{t("rtl")}</Label>
                <Select
                  value={formData.isRtl ? "rtl" : "ltr"}
                  onValueChange={(v) => setFormData((p) => ({ ...p, isRtl: v === "rtl" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ltr">{t("ltr")}</SelectItem>
                    <SelectItem value="rtl">{t("rtlOption")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("rtlHelper")}</p>
              </div>

              {/* Flag */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lang-flag">{t("flag")}</Label>
                <Input
                  id="lang-flag"
                  value={formData.flag}
                  onChange={(e) => setFormData((p) => ({ ...p, flag: e.target.value }))}
                  placeholder="us"
                />
                <p className="text-xs text-muted-foreground">{t("flagHelper")}</p>
              </div>

              {/* Order */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lang-order">{t("order")}</Label>
                <Input
                  id="lang-order"
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      order: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  min={0}
                />
                <p className="text-xs text-muted-foreground">{t("orderHelper")}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
                  <AlertCircle className="size-4 shrink-0" />
                  {error.message}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="mt-auto flex gap-3 border-t border-border pt-6">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t("drawer.cancel")}
              </Button>
              <Button
                className="flex-1"
                disabled={isPending || !formData.name.trim() || !formData.locale.trim()}
                onClick={handleSave}
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {isPending ? t("drawer.saving") : isCreate ? t("addLanguage") : t("drawer.save")}
              </Button>
            </div>
          </PerfectScroll>
        )}
      </SheetContent>
    </Sheet>
  );
}
