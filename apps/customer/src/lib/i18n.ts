/**
 * Customer App i18n configuration.
 *
 * This is the single source of truth for supported locales
 * in the customer-facing application.
 */

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export const DEFAULT_LOCALE = "vi" as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
