import { defaultLocale, locales } from "@ecom/i18n";
import type { Request } from "express";

/**
 * Extracts and negotiates the requested locale from Request headers
 * against the supported locales defined in the i18n package.
 */
export function getLocale(request: Request): string {
  const xLocale = request.headers["x-locale"];
  const acceptLanguage = request.headers["accept-language"];

  const resolvedXLocale = parseXLocale(xLocale);
  if (resolvedXLocale) {
    return resolvedXLocale;
  }

  const resolvedAcceptLanguage = parseAcceptLanguage(acceptLanguage);
  if (resolvedAcceptLanguage) {
    return resolvedAcceptLanguage;
  }

  return defaultLocale;
}

function parseXLocale(xLocale: unknown): string | null {
  if (typeof xLocale !== "string") {
    return null;
  }
  const cleanLocale = xLocale.trim().toLowerCase();
  if ((locales as readonly string[]).includes(cleanLocale)) {
    return cleanLocale;
  }
  const prefix = cleanLocale.split("-")[0] ?? "";
  if ((locales as readonly string[]).includes(prefix)) {
    return prefix;
  }
  return null;
}

function parseAcceptLanguage(acceptLanguage: unknown): string | null {
  if (typeof acceptLanguage !== "string") {
    return null;
  }
  const parsedLocales = acceptLanguage
    .split(",")
    .map((item) => (item.split(";")[0] ?? "").trim().toLowerCase());

  for (const rawLocale of parsedLocales) {
    if ((locales as readonly string[]).includes(rawLocale)) {
      return rawLocale;
    }
    const prefix = rawLocale.split("-")[0] ?? "";
    if ((locales as readonly string[]).includes(prefix)) {
      return prefix;
    }
  }
  return null;
}
