import enAuth from "../locales/en/auth.json";
import enCommon from "../locales/en/common.json";
import enCustomFields from "../locales/en/custom-fields.json";
import enCustomerAuth from "../locales/en/customer-auth.json";
import enCustomerDashboard from "../locales/en/customer-dashboard.json";
import enCustomerOrder from "../locales/en/customer-order.json";
import enCustomerProfile from "../locales/en/customer-profile.json";
import enCustomerWallet from "../locales/en/customer-wallet.json";
import enCustomers from "../locales/en/customers.json";
import enDeveloper from "../locales/en/developer.json";
import enLanguages from "../locales/en/languages.json";
import enNav from "../locales/en/nav.json";
import enOrders from "../locales/en/orders.json";
import enRoles from "../locales/en/roles.json";
import enSettings from "../locales/en/settings.json";
import enUsers from "../locales/en/users.json";

import viAuth from "../locales/vi/auth.json";
import viCommon from "../locales/vi/common.json";
import viCustomFields from "../locales/vi/custom-fields.json";
import viCustomerAuth from "../locales/vi/customer-auth.json";
import viCustomerDashboard from "../locales/vi/customer-dashboard.json";
import viCustomerOrder from "../locales/vi/customer-order.json";
import viCustomerProfile from "../locales/vi/customer-profile.json";
import viCustomerWallet from "../locales/vi/customer-wallet.json";
import viCustomers from "../locales/vi/customers.json";
import viDeveloper from "../locales/vi/developer.json";
import viLanguages from "../locales/vi/languages.json";
import viNav from "../locales/vi/nav.json";
import viOrders from "../locales/vi/orders.json";
import viRoles from "../locales/vi/roles.json";
import viSettings from "../locales/vi/settings.json";
import viUsers from "../locales/vi/users.json";

const messages = {
  en: {
    ...enCommon,
    users: enUsers,
    customerAuth: enCustomerAuth,
    customerProfile: enCustomerProfile,
    customerDashboard: enCustomerDashboard,
    orders: enOrders,
    auth: enAuth,
    nav: enNav,
    customers: enCustomers,
    roles: enRoles,
    settings: enSettings,
    languages: enLanguages,
    customFields: enCustomFields,
    developer: enDeveloper,
    customerOrder: enCustomerOrder,
    customerWallet: enCustomerWallet,
  },
  vi: {
    ...viCommon,
    users: viUsers,
    customerAuth: viCustomerAuth,
    customerProfile: viCustomerProfile,
    customerDashboard: viCustomerDashboard,
    orders: viOrders,
    auth: viAuth,
    nav: viNav,
    customers: viCustomers,
    roles: viRoles,
    settings: viSettings,
    languages: viLanguages,
    customFields: viCustomFields,
    developer: viDeveloper,
    customerOrder: viCustomerOrder,
    customerWallet: viCustomerWallet,
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
