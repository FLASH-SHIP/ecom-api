import type enAdminMenus from "@ecom/i18n/locales/en/admin-menus.json";
import type enAuditLogs from "@ecom/i18n/locales/en/audit-logs.json";
import type enCache from "@ecom/i18n/locales/en/cache.json";
import type enCategories from "@ecom/i18n/locales/en/categories.json";
import type enComments from "@ecom/i18n/locales/en/comments.json";
import type enCommon from "@ecom/i18n/locales/en/common.json";
import type enContacts from "@ecom/i18n/locales/en/contacts.json";
import type enCustomFields from "@ecom/i18n/locales/en/custom-fields.json";
import type enCustomers from "@ecom/i18n/locales/en/customers.json";
import type enDataTable from "@ecom/i18n/locales/en/data-table.json";
import type enLanguages from "@ecom/i18n/locales/en/languages.json";
import type enMedia from "@ecom/i18n/locales/en/media.json";
import type enNotifications from "@ecom/i18n/locales/en/notifications.json";
import type enPages from "@ecom/i18n/locales/en/pages.json";
import type enPosts from "@ecom/i18n/locales/en/posts.json";
import type enRequestLogs from "@ecom/i18n/locales/en/request-logs.json";
import type enRoles from "@ecom/i18n/locales/en/roles.json";
import type enSeo from "@ecom/i18n/locales/en/seo.json";
import type enSettings from "@ecom/i18n/locales/en/settings.json";
import type enSystem from "@ecom/i18n/locales/en/system.json";
import type enSystemInfo from "@ecom/i18n/locales/en/system-info.json";
import type enTags from "@ecom/i18n/locales/en/tags.json";
import type enTools from "@ecom/i18n/locales/en/tools.json";
import type enUsers from "@ecom/i18n/locales/en/users.json";
import type enWebhooks from "@ecom/i18n/locales/en/webhooks.json";

type Messages = typeof enCommon & {
  posts: typeof enPosts;
  categories: typeof enCategories;
  tags: typeof enTags;
  pages: typeof enPages;
  media: typeof enMedia;
  users: typeof enUsers;
  customers: typeof enCustomers;
  roles: typeof enRoles;
  settings: typeof enSettings;
  languages: typeof enLanguages;
  customFields: typeof enCustomFields;
  adminMenus: typeof enAdminMenus;
  cache: typeof enCache;
  systemInfo: typeof enSystemInfo;
  auditLogs: typeof enAuditLogs;
  requestLogs: typeof enRequestLogs;
  comments: typeof enComments;
  contacts: typeof enContacts;
  webhooks: typeof enWebhooks;
  notifications: typeof enNotifications;
  system: typeof enSystem;
  tools: typeof enTools;
  seo: typeof enSeo;
  dataTable: typeof enDataTable;
};

declare global {
  // Use type safe translation keys based on our English base locale
  interface IntlMessages extends Messages {}
}
