"use client";

import { trpc } from "@admin/lib/trpc";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import { Globe } from "lucide-react";

interface TranslationStatusIndicatorProps {
  entityType: "post" | "category" | "page" | "tag" | "menuItem";
  entityId: number;
  /** Pre-fetched translation map from batch query (entityId → langCode[]) */
  batchMap?: Record<number, string[]>;
}

/**
 * Shows small flag-style indicators for translation status.
 * ✅ = translation exists, ✏️ = missing translation
 *
 * When `batchMap` is provided, uses it directly (no extra queries).
 * Otherwise falls back to individual query (for standalone usage).
 */
export function TranslationStatusIndicator({
  entityType,
  entityId,
  batchMap,
}: TranslationStatusIndicatorProps) {
  const { data: languages } = trpc.viewer.languages.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: singleStatus } = trpc.viewer.translations.translationStatus.useQuery(
    { entityType, entityId },
    { staleTime: 30_000, enabled: !batchMap },
  );

  if (!languages) return null;

  const activeLanguages = languages.filter((l) => l.isActive);
  if (activeLanguages.length <= 1) return null;

  const translatedCodes = batchMap
    ? new Set(batchMap[entityId] ?? [])
    : singleStatus
      ? new Set(
          (Array.isArray(singleStatus)
            ? (singleStatus as unknown as { langCode: string }[])
            : (singleStatus.translations ?? [])
          ).map((t) => t.langCode),
        )
      : null;

  if (!translatedCodes) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5">
        <Globe className="mr-1 size-3 text-muted-foreground" />
        {activeLanguages.map((lang) => {
          const hasTranslation = translatedCodes.has(lang.code);
          return (
            <Tooltip key={lang.id}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded text-[10px] font-medium transition-colors",
                    hasTranslation
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
                  )}
                >
                  {lang.flag ?? lang.code.toUpperCase().slice(0, 2)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {lang.name}: {hasTranslation ? "✅ Translated" : "✏️ Missing"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
