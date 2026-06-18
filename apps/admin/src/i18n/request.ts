import { defaultLocale, type Locale, locales } from "@ecom/i18n";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * next-intl v4 request configuration.
 *
 * Picked up automatically via the `createNextIntlPlugin` in next.config.ts.
 *
 * Reads the user's locale preference from the NEXT_LOCALE cookie set by the
 * language switcher (I18nProvider). Falls back to defaultLocale ("en") if
 * no cookie is set.
 *
 * Uses explicit imports per locale for Turbopack compatibility.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale =
    cookieLocale && (locales as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  // Explicit per-locale imports for Turbopack compatibility
  const messages =
    locale === "vi"
      ? (await import("@ecom/i18n/locales/vi/common.json")).default
      : (await import("@ecom/i18n/locales/en/common.json")).default;

  return {
    locale,
    messages,
  };
});
