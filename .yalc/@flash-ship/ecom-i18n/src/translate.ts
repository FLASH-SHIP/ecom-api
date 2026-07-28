import enAuditLogs from "../locales/en/audit-logs.json";
import enAuth from "../locales/en/auth.json";
import enCache from "../locales/en/cache.json";
import enCategories from "../locales/en/categories.json";
import enComments from "../locales/en/comments.json";
import enCommon from "../locales/en/common.json";
import enContacts from "../locales/en/contacts.json";
import enCustomFields from "../locales/en/custom-fields.json";
import enCustomerAuth from "../locales/en/customer-auth.json";
import enCustomerDashboard from "../locales/en/customer-dashboard.json";
import enCustomerGroups from "../locales/en/customer-groups.json";
import enCustomerOrder from "../locales/en/customer-order.json";
import enCustomerProfile from "../locales/en/customer-profile.json";
import enCustomerWallet from "../locales/en/customer-wallet.json";
import enCustomers from "../locales/en/customers.json";
import enDataTable from "../locales/en/data-table.json";
import enDeveloper from "../locales/en/developer.json";
import enLanguages from "../locales/en/languages.json";
import enMedia from "../locales/en/media.json";
import enNav from "../locales/en/nav.json";
import enNotifications from "../locales/en/notifications.json";
import enOrders from "../locales/en/orders.json";
import enPages from "../locales/en/pages.json";
import enPosts from "../locales/en/posts.json";
import enRequestLogs from "../locales/en/request-logs.json";
import enRoles from "../locales/en/roles.json";
import enSeo from "../locales/en/seo.json";
import enSettings from "../locales/en/settings.json";
import enSystem from "../locales/en/system.json";
import enSystemInfo from "../locales/en/system-info.json";
import enTags from "../locales/en/tags.json";
import enTools from "../locales/en/tools.json";
import enUsers from "../locales/en/users.json";
import enWebhooks from "../locales/en/webhooks.json";

import viAuditLogs from "../locales/vi/audit-logs.json";
import viAuth from "../locales/vi/auth.json";
import viCache from "../locales/vi/cache.json";
import viCategories from "../locales/vi/categories.json";
import viComments from "../locales/vi/comments.json";
import viCommon from "../locales/vi/common.json";
import viContacts from "../locales/vi/contacts.json";
import viCustomFields from "../locales/vi/custom-fields.json";
import viCustomerAuth from "../locales/vi/customer-auth.json";
import viCustomerDashboard from "../locales/vi/customer-dashboard.json";
import viCustomerGroups from "../locales/vi/customer-groups.json";
import viCustomerOrder from "../locales/vi/customer-order.json";
import viCustomerProfile from "../locales/vi/customer-profile.json";
import viCustomerWallet from "../locales/vi/customer-wallet.json";
import viCustomers from "../locales/vi/customers.json";
import viDataTable from "../locales/vi/data-table.json";
import viDeveloper from "../locales/vi/developer.json";
import viLanguages from "../locales/vi/languages.json";
import viMedia from "../locales/vi/media.json";
import viNav from "../locales/vi/nav.json";
import viNotifications from "../locales/vi/notifications.json";
import viOrders from "../locales/vi/orders.json";
import viPages from "../locales/vi/pages.json";
import viPosts from "../locales/vi/posts.json";
import viRequestLogs from "../locales/vi/request-logs.json";
import viRoles from "../locales/vi/roles.json";
import viSeo from "../locales/vi/seo.json";
import viSettings from "../locales/vi/settings.json";
import viSystem from "../locales/vi/system.json";
import viSystemInfo from "../locales/vi/system-info.json";
import viTags from "../locales/vi/tags.json";
import viTools from "../locales/vi/tools.json";
import viUsers from "../locales/vi/users.json";
import viWebhooks from "../locales/vi/webhooks.json";

const messages = {
  en: {
    ...enCommon,
    auditLogs: enAuditLogs,
    auth: enAuth,
    cache: enCache,
    categories: enCategories,
    comments: enComments,
    contacts: enContacts,
    customFields: enCustomFields,
    customerAuth: enCustomerAuth,
    customerDashboard: enCustomerDashboard,
    customerGroups: enCustomerGroups,
    "customer-groups": enCustomerGroups,
    customerOrder: enCustomerOrder,
    customerProfile: enCustomerProfile,
    customerWallet: enCustomerWallet,
    customers: enCustomers,
    dataTable: enDataTable,
    developer: enDeveloper,
    languages: enLanguages,
    media: enMedia,
    nav: enNav,
    notifications: enNotifications,
    orders: enOrders,
    pages: enPages,
    posts: enPosts,
    requestLogs: enRequestLogs,
    roles: enRoles,
    seo: enSeo,
    settings: enSettings,
    systemInfo: enSystemInfo,
    system: enSystem,
    tags: enTags,
    tools: enTools,
    users: enUsers,
    webhooks: enWebhooks,
  },
  vi: {
    ...viCommon,
    auditLogs: viAuditLogs,
    auth: viAuth,
    cache: viCache,
    categories: viCategories,
    comments: viComments,
    contacts: viContacts,
    customFields: viCustomFields,
    customerAuth: viCustomerAuth,
    customerDashboard: viCustomerDashboard,
    customerGroups: viCustomerGroups,
    "customer-groups": viCustomerGroups,
    customerOrder: viCustomerOrder,
    customerProfile: viCustomerProfile,
    customerWallet: viCustomerWallet,
    customers: viCustomers,
    dataTable: viDataTable,
    developer: viDeveloper,
    languages: viLanguages,
    media: viMedia,
    nav: viNav,
    notifications: viNotifications,
    orders: viOrders,
    pages: viPages,
    posts: viPosts,
    requestLogs: viRequestLogs,
    roles: viRoles,
    seo: viSeo,
    settings: viSettings,
    systemInfo: viSystemInfo,
    system: viSystem,
    tags: viTags,
    tools: viTools,
    users: viUsers,
    webhooks: viWebhooks,
  },
} as const;

/**
 * Server & Client translate utility that statically loads localization JSON files.
 * Supports dot-notation paths (e.g. "customerAuth.login.emailUsername").
 */
export function translate(
  key: string,
  locale?: string | null,
  variables?: Record<string, unknown>,
): string {
  const resolvedLocale = locale === "en" ? "en" : "vi";
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
