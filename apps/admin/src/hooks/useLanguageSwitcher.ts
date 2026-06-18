"use client";

import { trpc } from "@admin/lib/trpc";
import type { LanguageTab } from "@ecom/ui/components/language-switcher";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Hook for managing language switcher state via URL search params.
 * Follows Botble's `?ref_lang=...` pattern for shareable, reload-safe translation editing.
 *
 * @param entityType - The content entity type (e.g., "post", "page", "category")
 * @param entityId - The entity ID being edited (optional for create pages)
 */
type EntityType = "post" | "category" | "page" | "tag" | "menuItem";

export function useLanguageSwitcher(entityType: EntityType, entityId?: number) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refLang = searchParams.get("ref_lang");

  const { data: activeLanguages } = trpc.viewer.languages.getActive.useQuery();
  const { data: translationStatus } = trpc.viewer.translations.translationStatus.useQuery(
    { entityType, entityId: entityId ?? 0 },
    { enabled: !!entityId },
  );

  const defaultLanguage = useMemo(
    () => activeLanguages?.find((l) => l.isDefault),
    [activeLanguages],
  );

  const activeCode = refLang ?? defaultLanguage?.code ?? null;

  const isDefaultLanguage = useMemo(() => {
    if (!activeCode || !defaultLanguage) return true;
    return activeCode === defaultLanguage.code;
  }, [activeCode, defaultLanguage]);

  const translatedCodes = useMemo(() => {
    if (!translationStatus) return new Set<string>();
    return new Set(translationStatus.map((t) => t.langCode));
  }, [translationStatus]);

  const languageTabs: LanguageTab[] = useMemo(() => {
    if (!activeLanguages) return [];
    return activeLanguages.map((lang) => ({
      code: lang.code,
      locale: lang.locale,
      name: lang.name,
      flag: lang.flag,
      isDefault: lang.isDefault,
      hasTranslation: lang.isDefault ? true : translatedCodes.has(lang.code),
    }));
  }, [activeLanguages, translatedCodes]);

  const onLanguageChange = useCallback(
    (code: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (defaultLanguage && code === defaultLanguage.code) {
        params.delete("ref_lang");
      } else {
        params.set("ref_lang", code);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams, defaultLanguage],
  );

  return {
    languageTabs,
    activeCode,
    isDefaultLanguage,
    defaultLanguage,
    onLanguageChange,
    refLang,
    activeLanguages,
  };
}
