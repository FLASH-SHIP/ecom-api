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
      ? {
          ...(await import("@ecom/i18n/locales/vi/common.json")).default,
          posts: (await import("@ecom/i18n/locales/vi/posts.json")).default,
          categories: (await import("@ecom/i18n/locales/vi/categories.json")).default,
          tags: (await import("@ecom/i18n/locales/vi/tags.json")).default,
          pages: (await import("@ecom/i18n/locales/vi/pages.json")).default,
          media: (await import("@ecom/i18n/locales/vi/media.json")).default,
          users: (await import("@ecom/i18n/locales/vi/users.json")).default,
          customers: (await import("@ecom/i18n/locales/vi/customers.json")).default,
          roles: (await import("@ecom/i18n/locales/vi/roles.json")).default,
          settings: (await import("@ecom/i18n/locales/vi/settings.json")).default,
          languages: (await import("@ecom/i18n/locales/vi/languages.json")).default,
          customFields: (await import("@ecom/i18n/locales/vi/custom-fields.json")).default,
          adminMenus: (await import("@ecom/i18n/locales/vi/admin-menus.json")).default,
          cache: (await import("@ecom/i18n/locales/vi/cache.json")).default,
          systemInfo: (await import("@ecom/i18n/locales/vi/system-info.json")).default,
          auditLogs: (await import("@ecom/i18n/locales/vi/audit-logs.json")).default,
          requestLogs: (await import("@ecom/i18n/locales/vi/request-logs.json")).default,
          comments: (await import("@ecom/i18n/locales/vi/comments.json")).default,
          contacts: (await import("@ecom/i18n/locales/vi/contacts.json")).default,
          webhooks: (await import("@ecom/i18n/locales/vi/webhooks.json")).default,
          notifications: (await import("@ecom/i18n/locales/vi/notifications.json")).default,
          system: (await import("@ecom/i18n/locales/vi/system.json")).default,
          tools: (await import("@ecom/i18n/locales/vi/tools.json")).default,
          seo: (await import("@ecom/i18n/locales/vi/seo.json")).default,
          dataTable: (await import("@ecom/i18n/locales/vi/data-table.json")).default,
          "customer-groups": (await import("@ecom/i18n/locales/vi/customer-groups.json")).default,
        }
      : {
          ...(await import("@ecom/i18n/locales/en/common.json")).default,
          posts: (await import("@ecom/i18n/locales/en/posts.json")).default,
          categories: (await import("@ecom/i18n/locales/en/categories.json")).default,
          tags: (await import("@ecom/i18n/locales/en/tags.json")).default,
          pages: (await import("@ecom/i18n/locales/en/pages.json")).default,
          media: (await import("@ecom/i18n/locales/en/media.json")).default,
          users: (await import("@ecom/i18n/locales/en/users.json")).default,
          customers: (await import("@ecom/i18n/locales/en/customers.json")).default,
          roles: (await import("@ecom/i18n/locales/en/roles.json")).default,
          settings: (await import("@ecom/i18n/locales/en/settings.json")).default,
          languages: (await import("@ecom/i18n/locales/en/languages.json")).default,
          customFields: (await import("@ecom/i18n/locales/en/custom-fields.json")).default,
          adminMenus: (await import("@ecom/i18n/locales/en/admin-menus.json")).default,
          cache: (await import("@ecom/i18n/locales/en/cache.json")).default,
          systemInfo: (await import("@ecom/i18n/locales/en/system-info.json")).default,
          auditLogs: (await import("@ecom/i18n/locales/en/audit-logs.json")).default,
          requestLogs: (await import("@ecom/i18n/locales/en/request-logs.json")).default,
          comments: (await import("@ecom/i18n/locales/en/comments.json")).default,
          contacts: (await import("@ecom/i18n/locales/en/contacts.json")).default,
          webhooks: (await import("@ecom/i18n/locales/en/webhooks.json")).default,
          notifications: (await import("@ecom/i18n/locales/en/notifications.json")).default,
          system: (await import("@ecom/i18n/locales/en/system.json")).default,
          tools: (await import("@ecom/i18n/locales/en/tools.json")).default,
          seo: (await import("@ecom/i18n/locales/en/seo.json")).default,
          dataTable: (await import("@ecom/i18n/locales/en/data-table.json")).default,
          "customer-groups": (await import("@ecom/i18n/locales/en/customer-groups.json")).default,
        };

  return {
    locale,
    messages,
  };
});
