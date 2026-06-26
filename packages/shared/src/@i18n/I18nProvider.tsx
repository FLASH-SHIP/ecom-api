"use client";
import { defaultLocale, locales } from "@ecom/i18n";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import I18nContext, { type LanguageType } from "./I18nContext";

type I18nProviderProps = {
  children: React.ReactNode;
  initialLocale?: string;
};

const languages: LanguageType[] = [
  { id: "en", title: "English", flag: "US" },
  { id: "vi", title: "Tiếng Việt", flag: "VN" },
];

/**
 * Read locale from NEXT_LOCALE cookie, falling back to defaultLocale.
 */
function getLocaleFromCookie(): string {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  if (value && (locales as readonly string[]).includes(value)) {
    return value;
  }
  return defaultLocale;
}

function setLocaleCookie(locale: string) {
  const maxAge = 365 * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noDocumentCookie: next-intl requires cookie-based locale persistence
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${maxAge};samesite=lax`;
}

export function I18nProvider(props: I18nProviderProps) {
  const { children, initialLocale } = props;
  const [languageId, setLanguageId] = useState(() => initialLocale || getLocaleFromCookie());

  const changeLanguage = useCallback(async (newLocale: string) => {
    if (!(locales as readonly string[]).includes(newLocale)) return;

    setLanguageId(newLocale);
    setLocaleCookie(newLocale);

    // Full page reload so next-intl picks up the new locale on the server
    window.location.reload();
  }, []);

  return (
    <I18nContext
      value={useMemo(
        () => ({
          language: languages.find((l) => l.id === languageId) ?? languages[0]!,
          languageId,
          langDirection: "ltr" as const,
          languages,
          changeLanguage,
        }),
        [languageId, changeLanguage],
      )}
    >
      {children}
    </I18nContext>
  );
}

export default I18nProvider;
