"use client";

import { useEffect, useRef, useState } from "react";
import useI18n from "../@i18n/useI18n";

const FLAG_EMOJIS: Record<string, string> = {
  VN: "🇻🇳",
  US: "🇺🇸",
  vi: "🇻🇳",
  en: "🇺🇸",
};

export function LanguageSwitcher() {
  const { language, languages, changeLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !language) {
    return (
      <div className="flex h-9 w-9 sm:w-28 items-center gap-1.5 rounded-lg border border-border px-2 py-1.5" />
    );
  }

  const currentFlag = FLAG_EMOJIS[language.flag] || FLAG_EMOJIS[language.id] || "🌐";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        aria-label="Change language"
      >
        <span className="hidden sm:inline">
          {currentFlag} {language.title}
        </span>
        <span className="sm:hidden">{currentFlag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[145px] rounded-lg border border-border bg-background py-1 shadow-xl">
          {languages.map((lng) => {
            const flag = FLAG_EMOJIS[lng.flag] || FLAG_EMOJIS[lng.id] || "🌐";
            const isActive = lng.id === language.id;
            return (
              <button
                key={lng.id}
                type="button"
                onClick={() => {
                  changeLanguage(lng.id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  isActive ? "font-semibold text-primary" : "text-foreground"
                }`}
              >
                <span>{flag}</span>
                <span>{lng.title}</span>
                {isActive && <span className="ml-auto text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
