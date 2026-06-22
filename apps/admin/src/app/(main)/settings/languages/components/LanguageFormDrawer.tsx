"use client";

import { useToast } from "@admin/components/toast-provider";
import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@ecom/ui/components/sheet";
import { AlertCircle, ChevronDown, Loader2, Save, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return "";
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

interface WorldLang {
  name: string;
  locale: string;
  code: string;
  flag?: string;
  isRtl?: boolean;
}

function LanguagePicker({
  languages,
  label,
  helperText,
  onSelect,
}: {
  languages: readonly WorldLang[];
  label: string;
  helperText: string;
  onSelect: (locale: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WorldLang | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return languages;
    const q = search.toLowerCase();
    return languages.filter(
      (l) => l.name.toLowerCase().includes(q) || l.locale.toLowerCase().includes(q),
    );
  }, [languages, search]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.flag && <span className="text-base">{getFlagEmoji(selected.flag)}</span>}
                <span>
                  {selected.name} ({selected.locale})
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              // biome-ignore lint/a11y/noAutofocus: intentional — search input inside a popover should receive focus immediately when the dropdown opens
              autoFocus
            />
          </div>
          {/* Language list */}
          <PerfectScroll className="max-h-56 py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No languages found.
              </p>
            ) : (
              filtered.map((wl) => (
                <button
                  key={wl.locale}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    setSelected(wl);
                    onSelect(wl.locale);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {wl.flag && (
                    <span className="text-base leading-none">{getFlagEmoji(wl.flag)}</span>
                  )}
                  <span>{wl.name}</span>
                  <span className="text-muted-foreground">({wl.locale})</span>
                </button>
              ))
            )}
          </PerfectScroll>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

/**
 * Country flags list for the flag picker.
 */
const FLAGS: { code: string; name: string }[] = [
  { code: "ad", name: "Andorra" },
  { code: "ae", name: "United Arab Emirates" },
  { code: "af", name: "Afghanistan" },
  { code: "ag", name: "Antigua and Barbuda" },
  { code: "ai", name: "Anguilla" },
  { code: "al", name: "Albania" },
  { code: "am", name: "Armenia" },
  { code: "ao", name: "Angola" },
  { code: "ar", name: "Argentina" },
  { code: "as", name: "American Samoa" },
  { code: "at", name: "Austria" },
  { code: "au", name: "Australia" },
  { code: "aw", name: "Aruba" },
  { code: "ax", name: "Åland Islands" },
  { code: "az", name: "Azerbaijan" },
  { code: "ba", name: "Bosnia and Herzegovina" },
  { code: "bb", name: "Barbados" },
  { code: "bd", name: "Bangladesh" },
  { code: "be", name: "Belgium" },
  { code: "bf", name: "Burkina Faso" },
  { code: "bg", name: "Bulgaria" },
  { code: "bh", name: "Bahrain" },
  { code: "bi", name: "Burundi" },
  { code: "bj", name: "Benin" },
  { code: "bm", name: "Bermuda" },
  { code: "bn", name: "Brunei" },
  { code: "bo", name: "Bolivia" },
  { code: "br", name: "Brazil" },
  { code: "bs", name: "Bahamas" },
  { code: "bt", name: "Bhutan" },
  { code: "bw", name: "Botswana" },
  { code: "by", name: "Belarus" },
  { code: "bz", name: "Belize" },
  { code: "ca", name: "Canada" },
  { code: "cc", name: "Cocos" },
  { code: "cd", name: "Democratic Republic of the Congo" },
  { code: "cf", name: "Central African Republic" },
  { code: "cg", name: "Congo" },
  { code: "ch", name: "Switzerland" },
  { code: "ci", name: "Ivory Coast" },
  { code: "ck", name: "Cook Islands" },
  { code: "cl", name: "Chile" },
  { code: "cm", name: "Cameroon" },
  { code: "cn", name: "China" },
  { code: "co", name: "Colombia" },
  { code: "cr", name: "Costa Rica" },
  { code: "cu", name: "Cuba" },
  { code: "cv", name: "Cape Verde" },
  { code: "cx", name: "Christmas Island" },
  { code: "cy", name: "Cyprus" },
  { code: "cz", name: "Czech Republic" },
  { code: "de", name: "Germany" },
  { code: "dj", name: "Djibouti" },
  { code: "dk", name: "Denmark" },
  { code: "dm", name: "Dominica" },
  { code: "do", name: "Dominican Republic" },
  { code: "dz", name: "Algeria" },
  { code: "ec", name: "Ecuador" },
  { code: "ee", name: "Estonia" },
  { code: "eg", name: "Egypt" },
  { code: "er", name: "Eritrea" },
  { code: "es", name: "Spain" },
  { code: "et", name: "Ethiopia" },
  { code: "fi", name: "Finland" },
  { code: "fj", name: "Fiji" },
  { code: "fk", name: "Falkland Islands" },
  { code: "fm", name: "Micronesia" },
  { code: "fo", name: "Faroe Islands" },
  { code: "fr", name: "France" },
  { code: "ga", name: "Gabon" },
  { code: "gb", name: "United Kingdom" },
  { code: "gd", name: "Grenada" },
  { code: "ge", name: "Georgia" },
  { code: "gh", name: "Ghana" },
  { code: "gi", name: "Gibraltar" },
  { code: "gl", name: "Greenland" },
  { code: "gm", name: "Gambia" },
  { code: "gn", name: "Guinea" },
  { code: "gq", name: "Equatorial Guinea" },
  { code: "gr", name: "Greece" },
  { code: "gt", name: "Guatemala" },
  { code: "gu", name: "Guam" },
  { code: "gw", name: "Guinea-Bissau" },
  { code: "gy", name: "Guyana" },
  { code: "hk", name: "Hong Kong" },
  { code: "hn", name: "Honduras" },
  { code: "hr", name: "Croatia" },
  { code: "ht", name: "Haiti" },
  { code: "hu", name: "Hungary" },
  { code: "id", name: "Indonesia" },
  { code: "ie", name: "Republic of Ireland" },
  { code: "il", name: "Israel" },
  { code: "in", name: "India" },
  { code: "iq", name: "Iraq" },
  { code: "ir", name: "Iran" },
  { code: "is", name: "Iceland" },
  { code: "it", name: "Italy" },
  { code: "jm", name: "Jamaica" },
  { code: "jo", name: "Jordan" },
  { code: "jp", name: "Japan" },
  { code: "ke", name: "Kenya" },
  { code: "kg", name: "Kyrgyzstan" },
  { code: "kh", name: "Cambodia" },
  { code: "ki", name: "Kiribati" },
  { code: "km", name: "Comoros" },
  { code: "kn", name: "Saint Kitts and Nevis" },
  { code: "kp", name: "North Korea" },
  { code: "kr", name: "South Korea" },
  { code: "kw", name: "Kuwait" },
  { code: "ky", name: "Cayman Islands" },
  { code: "kz", name: "Kazakhstan" },
  { code: "la", name: "Laos" },
  { code: "lb", name: "Lebanon" },
  { code: "lc", name: "Saint Lucia" },
  { code: "li", name: "Liechtenstein" },
  { code: "lk", name: "Sri Lanka" },
  { code: "lr", name: "Liberia" },
  { code: "ls", name: "Lesotho" },
  { code: "lt", name: "Lithuania" },
  { code: "lu", name: "Luxembourg" },
  { code: "lv", name: "Latvia" },
  { code: "ly", name: "Libya" },
  { code: "ma", name: "Morocco" },
  { code: "mc", name: "Monaco" },
  { code: "md", name: "Moldova" },
  { code: "me", name: "Montenegro" },
  { code: "mg", name: "Madagascar" },
  { code: "mh", name: "Marshall Islands" },
  { code: "mk", name: "Macedonia" },
  { code: "ml", name: "Mali" },
  { code: "mm", name: "Myanmar" },
  { code: "mn", name: "Mongolia" },
  { code: "mo", name: "Macao" },
  { code: "mt", name: "Malta" },
  { code: "mu", name: "Mauritius" },
  { code: "mv", name: "Maldives" },
  { code: "mw", name: "Malawi" },
  { code: "mx", name: "Mexico" },
  { code: "my", name: "Malaysia" },
  { code: "mz", name: "Mozambique" },
  { code: "na", name: "Namibia" },
  { code: "ne", name: "Niger" },
  { code: "ng", name: "Nigeria" },
  { code: "ni", name: "Nicaragua" },
  { code: "nl", name: "Netherlands" },
  { code: "no", name: "Norway" },
  { code: "np", name: "Nepal" },
  { code: "nr", name: "Nauru" },
  { code: "nz", name: "New Zealand" },
  { code: "om", name: "Oman" },
  { code: "pa", name: "Panama" },
  { code: "pe", name: "Peru" },
  { code: "pf", name: "French Polynesia" },
  { code: "pg", name: "Papua New Guinea" },
  { code: "ph", name: "Philippines" },
  { code: "pk", name: "Pakistan" },
  { code: "pl", name: "Poland" },
  { code: "pr", name: "Puerto Rico" },
  { code: "ps", name: "Palestinian Territory" },
  { code: "pt", name: "Portugal" },
  { code: "pw", name: "Belau" },
  { code: "py", name: "Paraguay" },
  { code: "qa", name: "Qatar" },
  { code: "ro", name: "Romania" },
  { code: "rs", name: "Serbia" },
  { code: "ru", name: "Russia" },
  { code: "rw", name: "Rwanda" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "sb", name: "Solomon Islands" },
  { code: "sc", name: "Seychelles" },
  { code: "sd", name: "Sudan" },
  { code: "se", name: "Sweden" },
  { code: "sg", name: "Singapore" },
  { code: "sh", name: "Saint Helena" },
  { code: "si", name: "Slovenia" },
  { code: "sk", name: "Slovakia" },
  { code: "sl", name: "Sierra Leone" },
  { code: "sm", name: "San Marino" },
  { code: "sn", name: "Senegal" },
  { code: "so", name: "Somalia" },
  { code: "sr", name: "Suriname" },
  { code: "ss", name: "South Sudan" },
  { code: "sv", name: "El Salvador" },
  { code: "sy", name: "Syria" },
  { code: "sz", name: "Swaziland" },
  { code: "td", name: "Chad" },
  { code: "tg", name: "Togo" },
  { code: "th", name: "Thailand" },
  { code: "tj", name: "Tajikistan" },
  { code: "tl", name: "Timor-Leste" },
  { code: "tm", name: "Turkmenistan" },
  { code: "tn", name: "Tunisia" },
  { code: "to", name: "Tonga" },
  { code: "tr", name: "Turkey" },
  { code: "tt", name: "Trinidad and Tobago" },
  { code: "tv", name: "Tuvalu" },
  { code: "tw", name: "Taiwan" },
  { code: "tz", name: "Tanzania" },
  { code: "ua", name: "Ukraine" },
  { code: "ug", name: "Uganda" },
  { code: "us", name: "United States" },
  { code: "uy", name: "Uruguay" },
  { code: "uz", name: "Uzbekistan" },
  { code: "va", name: "Vatican" },
  { code: "ve", name: "Venezuela" },
  { code: "vn", name: "Vietnam" },
  { code: "vu", name: "Vanuatu" },
  { code: "ye", name: "Yemen" },
  { code: "za", name: "South Africa" },
  { code: "zm", name: "Zambia" },
  { code: "zw", name: "Zimbabwe" },
];

function FlagPicker({
  value,
  label,
  helperText,
  onChange,
}: {
  value: string;
  label: string;
  helperText: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedFlag = FLAGS.find((f) => f.code === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return FLAGS;
    const q = search.toLowerCase();
    return FLAGS.filter(
      (f) => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {selectedFlag ? (
              <span className="flex items-center gap-2">
                <span className="text-base">{getFlagEmoji(selectedFlag.code)}</span>
                <span>{selectedFlag.name}</span>
              </span>
            ) : value ? (
              <span className="flex items-center gap-2">
                <span className="text-base">{getFlagEmoji(value)}</span>
                <span>{value}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flag..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              // biome-ignore lint/a11y/noAutofocus: intentional — search input inside a popover should receive focus immediately when the dropdown opens
              autoFocus
            />
          </div>
          <PerfectScroll className="max-h-56 py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No flags found.</p>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.code}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    onChange(f.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="text-base leading-none">{getFlagEmoji(f.code)}</span>
                  <span>{f.name}</span>
                </button>
              ))
            )}
          </PerfectScroll>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

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
            <div className="flex flex-col gap-5 pb-4">
              {/* Predefined language picker */}
              {isCreate && (
                <LanguagePicker
                  languages={availableWorldLanguages ?? []}
                  label={t("selectLanguage")}
                  helperText={t("selectLanguageHelper")}
                  onSelect={handleWorldLanguageSelect}
                />
              )}

              {/* Language name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lang-name">
                  {t("name")} <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="lang-locale">
                  {t("locale")} <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="lang-code">
                  {t("code")} <span className="text-destructive">*</span>
                </Label>
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
              <FlagPicker
                value={formData.flag}
                label={t("flag")}
                helperText={t("flagHelper")}
                onChange={(code) => setFormData((p) => ({ ...p, flag: code }))}
              />

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
