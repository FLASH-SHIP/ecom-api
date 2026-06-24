"use client";

import { env } from "@web/env";
import { usePathname } from "next/navigation";
import type { SupportedLocale } from "../lib/i18n";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";

const BASE_URL = env.NEXT_PUBLIC_APP_URL;

/**
 * OG locale mapping for social sharing.
 * Maps our locale codes to OpenGraph-standard locale strings.
 */
const OG_LOCALE_MAP: Record<SupportedLocale, string> = {
  vi: "vi_VN",
  en: "en_US",
};

/**
 * Extracts the base path by stripping the locale prefix from the current pathname.
 */
function getBasePath(pathname: string): { basePath: string; currentLocale: SupportedLocale } {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname.startsWith(`/${locale}/`)) {
      return { basePath: pathname.slice(locale.length + 1), currentLocale: locale };
    }
    if (pathname === `/${locale}`) {
      return { basePath: "", currentLocale: locale };
    }
  }
  return { basePath: pathname, currentLocale: DEFAULT_LOCALE };
}

/**
 * Injects SEO-critical tags into <head>:
 * - `<link rel="alternate" hreflang>` — tells search engines about equivalent pages in other languages
 * - `<link rel="canonical">` — prevents duplicate content penalties for locale-prefixed URLs
 * - `<meta property="og:locale">` — primary locale for social sharing
 * - `<meta property="og:locale:alternate">` — alternate locales for social sharing
 * - `<meta property="og:url">` — canonical URL for social sharing
 */
export function HrefLangTags() {
  const pathname = usePathname();
  const { basePath, currentLocale } = getBasePath(pathname);

  const canonicalUrl = `${BASE_URL}/${currentLocale}${basePath}`;
  const ogLocale = OG_LOCALE_MAP[currentLocale];
  const alternateLocales = SUPPORTED_LOCALES.filter((l) => l !== currentLocale);

  return (
    <>
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang alternate links */}
      {SUPPORTED_LOCALES.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={`${BASE_URL}/${locale}${basePath}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${BASE_URL}/${DEFAULT_LOCALE}${basePath}`}
      />

      {/* OpenGraph locale tags */}
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((locale) => (
        <meta
          key={`og-alt-${locale}`}
          property="og:locale:alternate"
          content={OG_LOCALE_MAP[locale]}
        />
      ))}
      <meta property="og:url" content={canonicalUrl} />
    </>
  );
}
