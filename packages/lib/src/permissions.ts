/**
 * Centralized permission constants for the Ecom.
 *
 * Convention: `module.resource.action`
 * Groups:    the first two segments form the group key used in the admin UI.
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

  // Members (Customers)
  MEMBERS_READ: "members.read",
  MEMBERS_CREATE: "members.create",
  MEMBERS_UPDATE: "members.update",
  MEMBERS_DELETE: "members.delete",

  // Custom Fields
  CUSTOM_FIELDS_READ: "custom-fields.read",
  CUSTOM_FIELDS_CREATE: "custom-fields.create",
  CUSTOM_FIELDS_UPDATE: "custom-fields.update",
  CUSTOM_FIELDS_DELETE: "custom-fields.delete",

  // Admin Menus
  ADMIN_MENUS_READ: "admin-menus.read",
  ADMIN_MENUS_CREATE: "admin-menus.create",
  ADMIN_MENUS_UPDATE: "admin-menus.update",
  ADMIN_MENUS_DELETE: "admin-menus.delete",

  // Settings
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",

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
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

/**
 * All permission entries as an array — used for seeding.
 */
export const ALL_PERMISSIONS: Array<{ name: string; displayName: string; group: string }> = [
  // Blog — Posts
  { name: Permissions.POSTS_READ, displayName: "View Posts", group: "blog" },
  { name: Permissions.POSTS_CREATE, displayName: "Create Posts", group: "blog" },
  { name: Permissions.POSTS_UPDATE, displayName: "Update Posts", group: "blog" },
  { name: Permissions.POSTS_DELETE, displayName: "Delete Posts", group: "blog" },

  // Blog — Categories
  { name: Permissions.CATEGORIES_READ, displayName: "View Categories", group: "blog" },
  { name: Permissions.CATEGORIES_CREATE, displayName: "Create Categories", group: "blog" },
  { name: Permissions.CATEGORIES_UPDATE, displayName: "Update Categories", group: "blog" },
  { name: Permissions.CATEGORIES_DELETE, displayName: "Delete Categories", group: "blog" },

  // Blog — Tags
  { name: Permissions.TAGS_READ, displayName: "View Tags", group: "blog" },
  { name: Permissions.TAGS_CREATE, displayName: "Create Tags", group: "blog" },
  { name: Permissions.TAGS_UPDATE, displayName: "Update Tags", group: "blog" },
  { name: Permissions.TAGS_DELETE, displayName: "Delete Tags", group: "blog" },

  // Pages
  { name: Permissions.PAGES_READ, displayName: "View Pages", group: "pages" },
  { name: Permissions.PAGES_CREATE, displayName: "Create Pages", group: "pages" },
  { name: Permissions.PAGES_UPDATE, displayName: "Update Pages", group: "pages" },
  { name: Permissions.PAGES_DELETE, displayName: "Delete Pages", group: "pages" },

  // Media
  { name: Permissions.MEDIA_READ, displayName: "View Media", group: "media" },
  { name: Permissions.MEDIA_UPLOAD, displayName: "Upload Media", group: "media" },
  { name: Permissions.MEDIA_UPDATE, displayName: "Update Media", group: "media" },
  { name: Permissions.MEDIA_DELETE, displayName: "Delete Media", group: "media" },

  // Users
  { name: Permissions.USERS_READ, displayName: "View Users", group: "users" },
  { name: Permissions.USERS_CREATE, displayName: "Create Users", group: "users" },
  { name: Permissions.USERS_UPDATE, displayName: "Update Users", group: "users" },
  { name: Permissions.USERS_DELETE, displayName: "Delete Users", group: "users" },

  // Roles
  { name: Permissions.ROLES_READ, displayName: "View Roles", group: "roles" },
  { name: Permissions.ROLES_CREATE, displayName: "Create Roles", group: "roles" },
  { name: Permissions.ROLES_UPDATE, displayName: "Update Roles", group: "roles" },
  { name: Permissions.ROLES_DELETE, displayName: "Delete Roles", group: "roles" },

  // Members
  { name: Permissions.MEMBERS_READ, displayName: "View Members", group: "members" },
  { name: Permissions.MEMBERS_CREATE, displayName: "Create Members", group: "members" },
  { name: Permissions.MEMBERS_UPDATE, displayName: "Update Members", group: "members" },
  { name: Permissions.MEMBERS_DELETE, displayName: "Delete Members", group: "members" },

  // Custom Fields
  {
    name: Permissions.CUSTOM_FIELDS_READ,
    displayName: "View Custom Fields",
    group: "custom-fields",
  },
  {
    name: Permissions.CUSTOM_FIELDS_CREATE,
    displayName: "Create Custom Fields",
    group: "custom-fields",
  },
  {
    name: Permissions.CUSTOM_FIELDS_UPDATE,
    displayName: "Update Custom Fields",
    group: "custom-fields",
  },
  {
    name: Permissions.CUSTOM_FIELDS_DELETE,
    displayName: "Delete Custom Fields",
    group: "custom-fields",
  },

  // Admin Menus
  { name: Permissions.ADMIN_MENUS_READ, displayName: "View Admin Menus", group: "admin-menus" },
  { name: Permissions.ADMIN_MENUS_CREATE, displayName: "Create Admin Menus", group: "admin-menus" },
  { name: Permissions.ADMIN_MENUS_UPDATE, displayName: "Update Admin Menus", group: "admin-menus" },
  { name: Permissions.ADMIN_MENUS_DELETE, displayName: "Delete Admin Menus", group: "admin-menus" },

  // Settings
  { name: Permissions.SETTINGS_READ, displayName: "View Settings", group: "settings" },
  { name: Permissions.SETTINGS_UPDATE, displayName: "Update Settings", group: "settings" },

  // Audit Logs
  { name: Permissions.AUDIT_LOGS_READ, displayName: "View Audit Logs", group: "audit-logs" },
  { name: Permissions.AUDIT_LOGS_PURGE, displayName: "Purge Audit Logs", group: "audit-logs" },

  // System
  { name: Permissions.SYSTEM_READ, displayName: "View System Info", group: "system" },
  { name: Permissions.SYSTEM_MANAGE, displayName: "Manage System", group: "system" },

  // Tools
  { name: Permissions.TOOLS_EXPORT, displayName: "Export Data", group: "tools" },
  { name: Permissions.TOOLS_IMPORT, displayName: "Import Data", group: "tools" },

  // Webhooks
  { name: Permissions.WEBHOOKS_READ, displayName: "View Webhooks", group: "webhooks" },
  { name: Permissions.WEBHOOKS_CREATE, displayName: "Create Webhooks", group: "webhooks" },
  { name: Permissions.WEBHOOKS_UPDATE, displayName: "Update Webhooks", group: "webhooks" },
  { name: Permissions.WEBHOOKS_DELETE, displayName: "Delete Webhooks", group: "webhooks" },

  // Comments
  { name: Permissions.COMMENTS_READ, displayName: "View Comments", group: "comments" },
  { name: Permissions.COMMENTS_MODERATE, displayName: "Moderate Comments", group: "comments" },
  { name: Permissions.COMMENTS_DELETE, displayName: "Delete Comments", group: "comments" },

  // Contacts
  { name: Permissions.CONTACTS_READ, displayName: "View Contact Submissions", group: "contacts" },
  { name: Permissions.CONTACTS_MANAGE, displayName: "Manage Contacts", group: "contacts" },
  {
    name: Permissions.CONTACTS_DELETE,
    displayName: "Delete Contact Submissions",
    group: "contacts",
  },
];
