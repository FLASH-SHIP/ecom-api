/**
 * Customer App i18n configuration.
 *
 * This is the single source of truth for supported locales
 * in the customer-facing application.
 */

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export const DEFAULT_LOCALE = "vi" as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Generates hreflang alternate link metadata for SEO.
 * Used in page-level `generateMetadata` functions.
 *
 * @example
 * ```ts
 * export async function generateMetadata({ params }: Props): Promise<Metadata> {
 *   return {
 *     alternates: {
 *       languages: generateHrefLangAlternates('/blog/hello-world'),
 *     },
 *   };
 * }
 * ```
 */
import { env } from "@web/env";

export function generateHrefLangAlternates(pathname: string): Record<string, string> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const alternates: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    alternates[locale] = `${baseUrl}/${locale}${cleanPath}`;
  }
  alternates["x-default"] = `${baseUrl}/${DEFAULT_LOCALE}${cleanPath}`;
  return alternates;
}

/**
 * For use with `generateStaticParams` to pre-render all locale variants.
 */
export function generateLocaleParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}
