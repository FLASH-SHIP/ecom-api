"use client";

import { Badge } from "./badge";
import { cn } from "../lib/utils";
import { Globe } from "lucide-react";
import { useCallback } from "react";

export interface LanguageTab {
  code: string;
  locale: string;
  name: string;
  flag?: string | null;
  isDefault: boolean;
  hasTranslation?: boolean;
}

interface LanguageSwitcherProps {
  languages: LanguageTab[];
  activeCode: string | null;
  onLanguageChange: (code: string) => void;
  className?: string;
}

/**
 * Reusable language tab bar for content edit forms.
 * Renders horizontal tabs per active language, with flag emoji and translation status.
 *
 * Designed to integrate with URL state (`?ref_lang=...`) following Botble's pattern.
 */
export function LanguageSwitcher({
  languages,
  activeCode,
  onLanguageChange,
  className,
}: LanguageSwitcherProps) {
  const handleClick = useCallback(
    (code: string) => {
      onLanguageChange(code);
    },
    [onLanguageChange],
  );

  if (languages.length <= 1) return null;

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      <div className="flex items-center gap-1 border-b border-border">
        <Globe className="ml-2 size-4 text-muted-foreground" />
        {languages.map((lang) => {
          const isActive = lang.code === activeCode || (activeCode === null && lang.isDefault);
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleClick(lang.code)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {lang.flag && <span className="text-sm">{getFlagEmoji(lang.flag)}</span>}
              <span>{lang.name}</span>
              {lang.isDefault && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                  Default
                </Badge>
              )}
              {!lang.isDefault && lang.hasTranslation === false && (
                <span className="size-1.5 rounded-full bg-amber-400" title="No translation" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return countryCode;
  const codePoints = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
