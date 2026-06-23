"use client";

import { Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "../lib/i18n";

const LOCALE_LABELS: Record<SupportedLocale, { label: string; flag: string }> = {
  vi: { label: "Tiếng Việt", flag: "🇻🇳" },
  en: { label: "English", flag: "🇺🇸" },
};

/**
 * Language switcher dropdown for the Customer App.
 * Reads the current locale from the URL path and navigates to the equivalent
 * path in the selected locale.
 */
export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect current locale from path
  const currentLocale: SupportedLocale =
    (SUPPORTED_LOCALES.find(
      (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
    ) as SupportedLocale) ?? DEFAULT_LOCALE;

  function switchLocale(targetLocale: SupportedLocale) {
    if (targetLocale === currentLocale) {
      setOpen(false);
      return;
    }

    // Replace the current locale prefix with the target locale
    let newPath: string;
    if (pathname.startsWith(`/${currentLocale}/`)) {
      newPath = `/${targetLocale}/${pathname.slice(currentLocale.length + 2)}`;
    } else if (pathname === `/${currentLocale}`) {
      newPath = `/${targetLocale}`;
    } else {
      newPath = `/${targetLocale}${pathname}`;
    }

    // Persist locale preference for returning visitors (read by middleware)
    // biome-ignore lint/suspicious/noDocumentCookie: intentional — locale cookie must be set client-side; no httpOnly needed as it's not sensitive
    document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    setOpen(false);
    router.push(newPath);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const current = LOCALE_LABELS[currentLocale];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        aria-label="Change language"
      >
        <Globe className="size-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">
          {current.flag} {current.label}
        </span>
        <span className="sm:hidden">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-border bg-background py-1 shadow-xl">
          {SUPPORTED_LOCALES.map((locale) => {
            const info = LOCALE_LABELS[locale];
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => switchLocale(locale)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  isActive ? "font-semibold text-primary" : "text-foreground"
                }`}
              >
                <span>{info.flag}</span>
                <span>{info.label}</span>
                {isActive && <span className="ml-auto text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
