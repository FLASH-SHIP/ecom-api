import enCommon from "../locales/en/common.json";
import enCustomerAuth from "../locales/en/customer-auth.json";
import enCustomerDashboard from "../locales/en/customer-dashboard.json";
import enCustomerProfile from "../locales/en/customer-profile.json";
import enUsers from "../locales/en/users.json";

import viCommon from "../locales/vi/common.json";
import viCustomerAuth from "../locales/vi/customer-auth.json";
import viCustomerDashboard from "../locales/vi/customer-dashboard.json";
import viCustomerProfile from "../locales/vi/customer-profile.json";
import viUsers from "../locales/vi/users.json";

const messages = {
  en: {
    ...enCommon,
    users: enUsers,
    customerAuth: enCustomerAuth,
    customerProfile: enCustomerProfile,
    customerDashboard: enCustomerDashboard,
  },
  vi: {
    ...viCommon,
    users: viUsers,
    customerAuth: viCustomerAuth,
    customerProfile: viCustomerProfile,
    customerDashboard: viCustomerDashboard,
  },
} as const;

/**
 * Server-side translate utility that statically loads localization JSON files.
 * Supports dot-notation paths (e.g. "users.profile.nameWhitespace").
 */
export function translate(
  key: string,
  locale: string | null | undefined,
  variables?: Record<string, unknown>,
): string {
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
    let result = current;
    if (variables) {
      for (const [vKey, vVal] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{${vKey}}`, "g"), String(vVal));
      }
    }
    return result;
  }
  return key;
}
