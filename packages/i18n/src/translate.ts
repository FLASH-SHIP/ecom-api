import enCommon from "../locales/en/common.json";
import enUsers from "../locales/en/users.json";
import viCommon from "../locales/vi/common.json";
import viUsers from "../locales/vi/users.json";

const messages = {
  en: {
    ...enCommon,
    users: enUsers,
  },
  vi: {
    ...viCommon,
    users: viUsers,
  },
} as const;

/**
 * Server-side translate utility that statically loads localization JSON files.
 * Supports dot-notation paths (e.g. "users.profile.nameWhitespace").
 */
export function translate(key: string, locale: string | null | undefined): string {
  const resolvedLocale = locale === "vi" ? "vi" : "en";
  const dict = messages[resolvedLocale];

  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key; // Fallback to raw key
    }
  }

  if (typeof current === "string") {
    return current;
  }
  return key;
}
