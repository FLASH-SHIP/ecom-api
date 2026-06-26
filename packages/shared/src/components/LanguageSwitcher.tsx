"use client";

import { useEffect, useRef, useState } from "react";
import useI18n from "../@i18n/useI18n";

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
      <div className="flex h-9 w-12 items-center gap-1 rounded-lg px-2 py-1.5" />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Change language"
      >
        <img
          className="h-4 w-5 shrink-0"
          src={`/assets/images/flags/${language.flag}.svg`}
          alt={language.title}
        />
        <span className="uppercase text-sm leading-none">{language.id}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg">
          {languages.map((lng) => {
            const isActive = lng.id === language.id;
            return (
              <button
                key={lng.id}
                type="button"
                onClick={() => {
                  changeLanguage(lng.id);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                  isActive ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <img
                  className="h-4 w-5 shrink-0"
                  src={`/assets/images/flags/${lng.flag}.svg`}
                  alt={lng.title}
                />
                <span className="truncate">{lng.title}</span>
                {isActive && <span className="ml-auto text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

