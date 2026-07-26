/**
 * Centralized permission constants for Ecom.
 *
 * Convention: `module.resource.action`
 * Dynamic hierarchy: sections group modules; modules group permissions; parent permissions represent dependencies.
 */

export const Permissions = {
  // Blog
  POSTS_READ: "blog.posts.read",
  POSTS_CREATE: "blog.posts.create",
  POSTS_UPDATE: "blog.posts.update",
  POSTS_DELETE: "blog.posts.delete",

  CATEGORIES_READ: "blog.categories.read",
  CATEGORIES_CREATE: "blog.categories.create",
  CATEGORIES_UPDATE: "blog.categories.update",
  CATEGORIES_DELETE: "blog.categories.delete",

  TAGS_READ: "blog.tags.read",
  TAGS_CREATE: "blog.tags.create",
  TAGS_UPDATE: "blog.tags.update",
  TAGS_DELETE: "blog.tags.delete",

  // Pages
  PAGES_READ: "pages.read",
  PAGES_CREATE: "pages.create",
  PAGES_UPDATE: "pages.update",
  PAGES_DELETE: "pages.delete",

  // Media
  MEDIA_READ: "media.read",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_UPDATE: "media.update",
  MEDIA_DELETE: "media.delete",

  // Users & Roles
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",

  // Customers
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_DELETE: "customers.delete",

  // Customer Groups
  CUSTOMER_GROUPS_READ: "customer-groups.read",
  CUSTOMER_GROUPS_CREATE: "customer-groups.create",
  CUSTOMER_GROUPS_UPDATE: "customer-groups.update",
  CUSTOMER_GROUPS_DELETE: "customer-groups.delete",

  // Custom Fields
  CUSTOM_FIELDS_READ: "custom-fields.read",
  CUSTOM_FIELDS_CREATE: "custom-fields.create",
  CUSTOM_FIELDS_UPDATE: "custom-fields.update",
  CUSTOM_FIELDS_DELETE: "custom-fields.delete",

  // Settings
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",

  // Rates
  RATES_READ: "rates.read",
  RATES_CREATE: "rates.create",
  RATES_UPDATE: "rates.update",
  RATES_APPROVE: "rates.approve",
  RATES_DELETE: "rates.delete",

  // Audit Logs
  AUDIT_LOGS_READ: "audit-logs.read",
  AUDIT_LOGS_PURGE: "audit-logs.purge",

  // System
  SYSTEM_READ: "system.read",
  SYSTEM_MANAGE: "system.manage",

  // Tools
  TOOLS_EXPORT: "tools.export",
  TOOLS_IMPORT: "tools.import",

  // Webhooks
  WEBHOOKS_READ: "webhooks.read",
  WEBHOOKS_CREATE: "webhooks.create",
  WEBHOOKS_UPDATE: "webhooks.update",
  WEBHOOKS_DELETE: "webhooks.delete",

  // Comments
  COMMENTS_READ: "comments.read",
  COMMENTS_MODERATE: "comments.moderate",
  COMMENTS_DELETE: "comments.delete",

  // Contacts
  CONTACTS_READ: "contacts.read",
  CONTACTS_MANAGE: "contacts.manage",
  CONTACTS_DELETE: "contacts.delete",

  // Partners
  PARTNERS_READ: "settings.partners.read",
  PARTNERS_CREATE: "settings.partners.create",
  PARTNERS_UPDATE: "settings.partners.update",
  PARTNERS_DELETE: "settings.partners.delete",

  // Notifications
  NOTIFICATIONS_BROADCAST_READ: "notifications.broadcast.read",
  NOTIFICATIONS_BROADCAST_CREATE: "notifications.broadcast.create",
  NOTIFICATIONS_BROADCAST_DELETE: "notifications.broadcast.delete",
  NOTIFICATIONS_SETTINGS_READ: "notifications.settings.read",
  NOTIFICATIONS_SETTINGS_UPDATE: "notifications.settings.update",
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

export interface SystemPermission {
  name: string;
  displayName: string;
  group: string; // Backward compatibility with Prisma schema & seeders
  section: string; // Top-level section grouping: "cms" | "system" | "settings" | "tools"
  module: string; // Feature grouping: e.g. "posts" | "users" | "media"
  parent?: string; // Flag of parent permission dependency (typically the .read action)
}

/**
 * All permission entries mapped with structural hierarchy.
 */
export const ALL_PERMISSIONS: SystemPermission[] = [
  // ── CMS Section ───────────────────────────────────────────────────────────
  // Blog — Posts
  {
    name: Permissions.POSTS_READ,
    displayName: "View Posts",
    group: "blog",
    section: "cms",
    module: "posts",
  },
  {
    name: Permissions.POSTS_CREATE,
    displayName: "Create Posts",
    group: "blog",
    section: "cms",
    module: "posts",
    parent: Permissions.POSTS_READ,
  },
  {
    name: Permissions.POSTS_UPDATE,
    displayName: "Update Posts",
    group: "blog",
    section: "cms",
    module: "posts",
    parent: Permissions.POSTS_READ,
  },
  {
    name: Permissions.POSTS_DELETE,
    displayName: "Delete Posts",
    group: "blog",
    section: "cms",
    module: "posts",
    parent: Permissions.POSTS_READ,
  },

  // Blog — Categories
  {
    name: Permissions.CATEGORIES_READ,
    displayName: "View Categories",
    group: "blog",
    section: "cms",
    module: "categories",
  },
  {
    name: Permissions.CATEGORIES_CREATE,
    displayName: "Create Categories",
    group: "blog",
    section: "cms",
    module: "categories",
    parent: Permissions.CATEGORIES_READ,
  },
  {
    name: Permissions.CATEGORIES_UPDATE,
    displayName: "Update Categories",
    group: "blog",
    section: "cms",
    module: "categories",
    parent: Permissions.CATEGORIES_READ,
  },
  {
    name: Permissions.CATEGORIES_DELETE,
    displayName: "Delete Categories",
    group: "blog",
    section: "cms",
    module: "categories",
    parent: Permissions.CATEGORIES_READ,
  },

  // Blog — Tags
  {
    name: Permissions.TAGS_READ,
    displayName: "View Tags",
    group: "blog",
    section: "cms",
    module: "tags",
  },
  {
    name: Permissions.TAGS_CREATE,
    displayName: "Create Tags",
    group: "blog",
    section: "cms",
    module: "tags",
    parent: Permissions.TAGS_READ,
  },
  {
    name: Permissions.TAGS_UPDATE,
    displayName: "Update Tags",
    group: "blog",
    section: "cms",
    module: "tags",
    parent: Permissions.TAGS_READ,
  },
  {
    name: Permissions.TAGS_DELETE,
    displayName: "Delete Tags",
    group: "blog",
    section: "cms",
    module: "tags",
    parent: Permissions.TAGS_READ,
  },

  // Pages
  {
    name: Permissions.PAGES_READ,
    displayName: "View Pages",
    group: "pages",
    section: "cms",
    module: "pages",
  },
  {
    name: Permissions.PAGES_CREATE,
    displayName: "Create Pages",
    group: "pages",
    section: "cms",
    module: "pages",
    parent: Permissions.PAGES_READ,
  },
  {
    name: Permissions.PAGES_UPDATE,
    displayName: "Update Pages",
    group: "pages",
    section: "cms",
    module: "pages",
    parent: Permissions.PAGES_READ,
  },
  {
    name: Permissions.PAGES_DELETE,
    displayName: "Delete Pages",
    group: "pages",
    section: "cms",
    module: "pages",
    parent: Permissions.PAGES_READ,
  },

  // Media
  {
    name: Permissions.MEDIA_READ,
    displayName: "View Media",
    group: "media",
    section: "cms",
    module: "media",
  },
  {
    name: Permissions.MEDIA_UPLOAD,
    displayName: "Upload Media",
    group: "media",
    section: "cms",
    module: "media",
    parent: Permissions.MEDIA_READ,
  },
  {
    name: Permissions.MEDIA_UPDATE,
    displayName: "Update Media",
    group: "media",
    section: "cms",
    module: "media",
    parent: Permissions.MEDIA_READ,
  },
  {
    name: Permissions.MEDIA_DELETE,
    displayName: "Delete Media",
    group: "media",
    section: "cms",
    module: "media",
    parent: Permissions.MEDIA_READ,
  },

  // Custom Fields
  {
    name: Permissions.CUSTOM_FIELDS_READ,
    displayName: "View Custom Fields",
    group: "custom-fields",
    section: "cms",
    module: "custom-fields",
  },
  {
    name: Permissions.CUSTOM_FIELDS_CREATE,
    displayName: "Create Custom Fields",
    group: "custom-fields",
    section: "cms",
    module: "custom-fields",
    parent: Permissions.CUSTOM_FIELDS_READ,
  },
  {
    name: Permissions.CUSTOM_FIELDS_UPDATE,
    displayName: "Update Custom Fields",
    group: "custom-fields",
    section: "cms",
    module: "custom-fields",
    parent: Permissions.CUSTOM_FIELDS_READ,
  },
  {
    name: Permissions.CUSTOM_FIELDS_DELETE,
    displayName: "Delete Custom Fields",
    group: "custom-fields",
    section: "cms",
    module: "custom-fields",
    parent: Permissions.CUSTOM_FIELDS_READ,
  },

  // Comments
  {
    name: Permissions.COMMENTS_READ,
    displayName: "View Comments",
    group: "comments",
    section: "cms",
    module: "comments",
  },
  {
    name: Permissions.COMMENTS_MODERATE,
    displayName: "Moderate Comments",
    group: "comments",
    section: "cms",
    module: "comments",
    parent: Permissions.COMMENTS_READ,
  },
  {
    name: Permissions.COMMENTS_DELETE,
    displayName: "Delete Comments",
    group: "comments",
    section: "cms",
    module: "comments",
    parent: Permissions.COMMENTS_READ,
  },

  // Contacts
  {
    name: Permissions.CONTACTS_READ,
    displayName: "View Contact Submissions",
    group: "contacts",
    section: "cms",
    module: "contacts",
  },
  {
    name: Permissions.CONTACTS_MANAGE,
    displayName: "Manage Contacts",
    group: "contacts",
    section: "cms",
    module: "contacts",
    parent: Permissions.CONTACTS_READ,
  },
  {
    name: Permissions.CONTACTS_DELETE,
    displayName: "Delete Contact Submissions",
    group: "contacts",
    section: "cms",
    module: "contacts",
    parent: Permissions.CONTACTS_READ,
  },

  // ── System Section ────────────────────────────────────────────────────────
  // Users
  {
    name: Permissions.USERS_READ,
    displayName: "View Users",
    group: "users",
    section: "system",
    module: "users",
  },
  {
    name: Permissions.USERS_CREATE,
    displayName: "Create Users",
    group: "users",
    section: "system",
    module: "users",
    parent: Permissions.USERS_READ,
  },
  {
    name: Permissions.USERS_UPDATE,
    displayName: "Update Users",
    group: "users",
    section: "system",
    module: "users",
    parent: Permissions.USERS_READ,
  },
  {
    name: Permissions.USERS_DELETE,
    displayName: "Delete Users",
    group: "users",
    section: "system",
    module: "users",
    parent: Permissions.USERS_READ,
  },

  // Roles
  {
    name: Permissions.ROLES_READ,
    displayName: "View Roles",
    group: "roles",
    section: "system",
    module: "roles",
  },
  {
    name: Permissions.ROLES_CREATE,
    displayName: "Create Roles",
    group: "roles",
    section: "system",
    module: "roles",
    parent: Permissions.ROLES_READ,
  },
  {
    name: Permissions.ROLES_UPDATE,
    displayName: "Update Roles",
    group: "roles",
    section: "system",
    module: "roles",
    parent: Permissions.ROLES_READ,
  },
  {
    name: Permissions.ROLES_DELETE,
    displayName: "Delete Roles",
    group: "roles",
    section: "system",
    module: "roles",
    parent: Permissions.ROLES_READ,
  },

  // Customers
  {
    name: Permissions.CUSTOMERS_READ,
    displayName: "View Customers",
    group: "customers",
    section: "system",
    module: "customers",
  },
  {
    name: Permissions.CUSTOMERS_CREATE,
    displayName: "Create Customers",
    group: "customers",
    section: "system",
    module: "customers",
    parent: Permissions.CUSTOMERS_READ,
  },
  {
    name: Permissions.CUSTOMERS_UPDATE,
    displayName: "Update Customers",
    group: "customers",
    section: "system",
    module: "customers",
    parent: Permissions.CUSTOMERS_READ,
  },
  {
    name: Permissions.CUSTOMERS_DELETE,
    displayName: "Delete Customers",
    group: "customers",
    section: "system",
    module: "customers",
    parent: Permissions.CUSTOMERS_READ,
  },

  // Customer Groups
  {
    name: Permissions.CUSTOMER_GROUPS_READ,
    displayName: "View Customer Groups",
    group: "customers",
    section: "system",
    module: "customer-groups",
  },
  {
    name: Permissions.CUSTOMER_GROUPS_CREATE,
    displayName: "Create Customer Groups",
    group: "customers",
    section: "system",
    module: "customer-groups",
    parent: Permissions.CUSTOMER_GROUPS_READ,
  },
  {
    name: Permissions.CUSTOMER_GROUPS_UPDATE,
    displayName: "Update Customer Groups",
    group: "customers",
    section: "system",
    module: "customer-groups",
    parent: Permissions.CUSTOMER_GROUPS_READ,
  },
  {
    name: Permissions.CUSTOMER_GROUPS_DELETE,
    displayName: "Delete Customer Groups",
    group: "customers",
    section: "system",
    module: "customer-groups",
    parent: Permissions.CUSTOMER_GROUPS_READ,
  },

  // Audit Logs
  {
    name: Permissions.AUDIT_LOGS_READ,
    displayName: "View Audit Logs",
    group: "audit-logs",
    section: "system",
    module: "audit-logs",
  },
  {
    name: Permissions.AUDIT_LOGS_PURGE,
    displayName: "Purge Audit Logs",
    group: "audit-logs",
    section: "system",
    module: "audit-logs",
    parent: Permissions.AUDIT_LOGS_READ,
  },

  // Webhooks
  {
    name: Permissions.WEBHOOKS_READ,
    displayName: "View Webhooks",
    group: "webhooks",
    section: "system",
    module: "webhooks",
  },
  {
    name: Permissions.WEBHOOKS_CREATE,
    displayName: "Create Webhooks",
    group: "webhooks",
    section: "system",
    module: "webhooks",
    parent: Permissions.WEBHOOKS_READ,
  },
  {
    name: Permissions.WEBHOOKS_UPDATE,
    displayName: "Update Webhooks",
    group: "webhooks",
    section: "system",
    module: "webhooks",
    parent: Permissions.WEBHOOKS_READ,
  },
  {
    name: Permissions.WEBHOOKS_DELETE,
    displayName: "Delete Webhooks",
    group: "webhooks",
    section: "system",
    module: "webhooks",
    parent: Permissions.WEBHOOKS_READ,
  },

  // System Settings
  {
    name: Permissions.SYSTEM_READ,
    displayName: "View System Info",
    group: "system",
    section: "system",
    module: "system",
  },
  {
    name: Permissions.SYSTEM_MANAGE,
    displayName: "Manage System",
    group: "system",
    section: "system",
    module: "system",
    parent: Permissions.SYSTEM_READ,
  },

  // ── Settings Section ──────────────────────────────────────────────────────
  {
    name: Permissions.SETTINGS_READ,
    displayName: "View Settings",
    group: "settings",
    section: "settings",
    module: "settings",
  },
  {
    name: Permissions.SETTINGS_UPDATE,
    displayName: "Update Settings",
    group: "settings",
    section: "settings",
    module: "settings",
    parent: Permissions.SETTINGS_READ,
  },

  // Rates
  {
    name: Permissions.RATES_READ,
    displayName: "View Shipping Rates",
    group: "rates",
    section: "settings",
    module: "rates",
  },
  {
    name: Permissions.RATES_CREATE,
    displayName: "Create Shipping Rates",
    group: "rates",
    section: "settings",
    module: "rates",
    parent: Permissions.RATES_READ,
  },
  {
    name: Permissions.RATES_UPDATE,
    displayName: "Update Shipping Rates",
    group: "rates",
    section: "settings",
    module: "rates",
    parent: Permissions.RATES_READ,
  },
  {
    name: Permissions.RATES_APPROVE,
    displayName: "Approve Shipping Rates",
    group: "rates",
    section: "settings",
    module: "rates",
    parent: Permissions.RATES_READ,
  },
  {
    name: Permissions.RATES_DELETE,
    displayName: "Delete Shipping Rates",
    group: "rates",
    section: "settings",
    module: "rates",
    parent: Permissions.RATES_READ,
  },

  // ── Partners & Services ───────────────────────────────────────────────────
  {
    name: Permissions.PARTNERS_READ,
    displayName: "View Partners",
    group: "partners",
    section: "settings",
    module: "partners",
  },
  {
    name: Permissions.PARTNERS_CREATE,
    displayName: "Create Partners",
    group: "partners",
    section: "settings",
    module: "partners",
    parent: Permissions.PARTNERS_READ,
  },
  {
    name: Permissions.PARTNERS_UPDATE,
    displayName: "Update Partners",
    group: "partners",
    section: "settings",
    module: "partners",
    parent: Permissions.PARTNERS_READ,
  },
  {
    name: Permissions.PARTNERS_DELETE,
    displayName: "Delete Partners",
    group: "partners",
    section: "settings",
    module: "partners",
    parent: Permissions.PARTNERS_READ,
  },

  // ── Tools Section ─────────────────────────────────────────────────────────
  {
    name: Permissions.TOOLS_EXPORT,
    displayName: "Export Data",
    group: "tools",
    section: "tools",
    module: "tools",
  },
  {
    name: Permissions.TOOLS_IMPORT,
    displayName: "Import Data",
    group: "tools",
    section: "tools",
    module: "tools",
  },

  // Notifications
  {
    name: Permissions.NOTIFICATIONS_BROADCAST_READ,
    displayName: "View Broadcasts",
    group: "notifications",
    section: "system",
    module: "notifications",
  },
  {
    name: Permissions.NOTIFICATIONS_BROADCAST_CREATE,
    displayName: "Create Broadcasts",
    group: "notifications",
    section: "system",
    module: "notifications",
    parent: Permissions.NOTIFICATIONS_BROADCAST_READ,
  },
  {
    name: Permissions.NOTIFICATIONS_BROADCAST_DELETE,
    displayName: "Delete Broadcasts",
    group: "notifications",
    section: "system",
    module: "notifications",
    parent: Permissions.NOTIFICATIONS_BROADCAST_READ,
  },
  {
    name: Permissions.NOTIFICATIONS_SETTINGS_READ,
    displayName: "View Notification Settings",
    group: "notifications",
    section: "settings",
    module: "notifications",
  },
  {
    name: Permissions.NOTIFICATIONS_SETTINGS_UPDATE,
    displayName: "Update Notification Settings",
    group: "notifications",
    section: "settings",
    module: "notifications",
    parent: Permissions.NOTIFICATIONS_SETTINGS_READ,
  },
];
