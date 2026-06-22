"use client";

import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { useToast } from "@admin/components/toast-provider";
import { COUNTRIES } from "@admin/components/ui/PhoneInput";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Separator } from "@ecom/ui/components/separator";
import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "@ecom/ui/lib/utils";
import { AlertCircle, HelpCircle, Loader2, Save, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const SETTING_KEYS = [
  "phone_number_enable_country_code",
  "phone_number_available_countries",
  "phone_number_min_length",
  "phone_number_max_length",
];

export default function PhoneSettingsPage() {
  const t = useTranslations("settings");
  const { toast } = useToast();

  const [enableCountryCode, setEnableCountryCode] = useState(true);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [minLength, setMinLength] = useState<string>("8");
  const [maxLength, setMaxLength] = useState<string>("15");
  const [searchQuery, setSearchQuery] = useState("");

  const [dirty, setDirty] = useState(false);

  const { data: settings, isLoading } = trpc.viewer.settings.getMany.useQuery(
    { keys: SETTING_KEYS },
    { placeholderData: (prev) => prev },
  );

  const utils = trpc.useUtils();

  const bulkSetMut = trpc.viewer.settings.bulkSet.useMutation({
    onSuccess: () => {
      toast(t("phoneNumber.saved"), "success");
      utils.viewer.settings.getMany.invalidate();
      setDirty(false);
    },
    onError: (err) => toast(err.message, "error"),
  });

  // Load settings into state
  useEffect(() => {
    if (!settings) return;

    const enableVal = settings.phone_number_enable_country_code;
    setEnableCountryCode(enableVal === "1" || enableVal === null || enableVal === undefined); // default to true

    const countriesVal = settings.phone_number_available_countries;
    if (countriesVal) {
      try {
        setSelectedCountries(JSON.parse(countriesVal));
      } catch {
        setSelectedCountries(COUNTRIES.map((c) => c.code));
      }
    } else {
      // Default: select all
      setSelectedCountries(COUNTRIES.map((c) => c.code));
    }

    const minVal = settings.phone_number_min_length;
    setMinLength(minVal ?? "8");

    const maxVal = settings.phone_number_max_length;
    setMaxLength(maxVal ?? "15");

    setDirty(false);
  }, [settings]);

  // Handle individual country toggling
  const handleCountryToggle = (code: string) => {
    setSelectedCountries((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      setDirty(true);
      return next;
    });
  };

  // Checkbox: select all handler
  const isAllSelected = selectedCountries.length === COUNTRIES.length;
  const isIndeterminate =
    selectedCountries.length > 0 && selectedCountries.length < COUNTRIES.length;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedCountries([]);
    } else {
      setSelectedCountries(COUNTRIES.map((c) => c.code));
    }
    setDirty(true);
  };

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.dial.includes(q),
    );
  }, [searchQuery]);

  const handleSave = () => {
    const items = [
      { key: "phone_number_enable_country_code", value: enableCountryCode ? "1" : "0" },
      { key: "phone_number_available_countries", value: JSON.stringify(selectedCountries) },
      { key: "phone_number_min_length", value: minLength },
      { key: "phone_number_max_length", value: maxLength },
    ];
    bulkSetMut.mutate({ items });
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Skeleton className="h-[60px] w-full rounded-xl" />
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in duration-300">
      <PageBreadcrumb className="mb-0" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">{t("phoneNumber.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("phoneNumber.description")}</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || bulkSetMut.isPending}>
          {bulkSetMut.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {bulkSetMut.isPending ? t("saving") : t("save")}
        </Button>
      </div>

      {bulkSetMut.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive dark:bg-red-950">
          <AlertCircle className="size-4 shrink-0" />
          {bulkSetMut.error.message}
        </div>
      )}

      {/* Main Single Card Box */}
      <Card className="rounded-lg shadow-none border-border/80">
        <CardContent className="flex flex-col gap-6 p-6">
          {/* Section 1: Enable country selection */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="enable-country-code"
              checked={enableCountryCode}
              onCheckedChange={(checked) => {
                setEnableCountryCode(!!checked);
                setDirty(true);
              }}
              className="mt-1"
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="enable-country-code" className="font-semibold cursor-pointer">
                {t("phoneNumber.enableCountryCode")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("phoneNumber.enableCountryCodeHelper")}
              </p>
            </div>
          </div>

          {/* Section 2: Countries Checklist selection (collapsible) */}
          {enableCountryCode && (
            <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/40 p-4 transition-all animate-in fade-in duration-300">
              {/* Select All and Search */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-countries"
                    checked={isIndeterminate ? "indeterminate" : isAllSelected}
                    onCheckedChange={handleSelectAllToggle}
                  />
                  <Label
                    htmlFor="select-all-countries"
                    className="text-sm font-semibold cursor-pointer"
                  >
                    {t("phoneNumber.all")}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({t("phoneNumber.allHelperText")})
                  </span>
                </div>

                {/* Search country box */}
                <div className="relative flex max-w-xs items-center">
                  <Search className="absolute left-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Countries Grid */}
              <div className="max-h-[320px] overflow-y-auto rounded-md border border-border bg-background p-3">
                {filteredCountries.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No country matches your query.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {filteredCountries.map((c) => {
                      const isSelected = selectedCountries.includes(c.code);
                      return (
                        <label
                          key={c.code}
                          htmlFor={`country-checkbox-${c.code}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-3 py-1.5 transition-all hover:bg-accent/50",
                            isSelected && "border-primary/20 bg-primary/5 dark:bg-primary/10",
                          )}
                        >
                          <Checkbox
                            id={`country-checkbox-${c.code}`}
                            checked={isSelected}
                            onCheckedChange={() => handleCountryToggle(c.code)}
                          />
                          <span className="text-base">{c.flag}</span>
                          <span className="flex-1 truncate text-xs font-medium">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.dial}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Section 3: Min / Max lengths */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Min Length */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min-length" className="font-semibold">
                {t("phoneNumber.minLength")}
              </Label>
              <Input
                id="min-length"
                type="number"
                min={1}
                max={20}
                value={minLength}
                onChange={(e) => {
                  setMinLength(e.target.value);
                  setDirty(true);
                }}
              />
              <p className="text-xs text-muted-foreground">{t("phoneNumber.minLengthHelper")}</p>
            </div>

            {/* Max Length */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max-length" className="font-semibold">
                {t("phoneNumber.maxLength")}
              </Label>
              <Input
                id="max-length"
                type="number"
                min={1}
                max={30}
                value={maxLength}
                onChange={(e) => {
                  setMaxLength(e.target.value);
                  setDirty(true);
                }}
              />
              <p className="text-xs text-muted-foreground">{t("phoneNumber.maxLengthHelper")}</p>
            </div>
          </div>

          <Separator />

          {/* Section 4: Warning/Notes box */}
          <div className="flex gap-3 rounded-r-md border-l-4 border-info bg-info/5 p-4 text-xs dark:bg-info/10">
            <HelpCircle className="size-4 shrink-0 text-info" />
            <div className="whitespace-pre-line leading-normal text-muted-foreground">
              {t("phoneNumber.noteContent")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
