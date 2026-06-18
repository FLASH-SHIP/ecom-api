/**
 * Admin Menu seeder — seeds default sidebar navigation structure.
 *
 * Safety:
 *  - Uses upsert-by-key — safe to run multiple times
 *  - NEVER deleteMany before insert (old pattern was destructive)
 *  - Parent resolution via key → id map built from DB, not memory-only
 *  - If admin customized an item via UI, only icon/route/priority are refreshed;
 *    name is NOT overwritten (admins may have translated/renamed it)
 */

import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeedItem {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  permissions?: string[];
  childrenDisplay?: string;
  section?: string;
  priority: number;
  parentKey?: string;
}

// ── Menu definitions ─────────────────────────────────────────────────────────

const MENU_ITEMS: SeedItem[] = [
  // ─── Top-level items ───────────────────────────────
  {
    key: "cms-core-dashboard",
    name: "Dashboard",
    icon: "ti ti-home",
    route: "/",
    priority: 1,
  },
  {
    key: "cms-core-page",
    name: "Pages",
    icon: "ti ti-notebook",
    route: "/pages",
    priority: 2,
    permissions: ["pages.index"],
  },
  {
    key: "cms-plugins-blog",
    name: "Blog",
    icon: "ti ti-article",
    priority: 3,
    permissions: ["posts.index", "categories.index", "tags.index"],
    childrenDisplay: "sidebar",
  },
  {
    key: "cms-plugins-gallery",
    name: "Galleries",
    icon: "ti ti-camera",
    route: "/galleries",
    priority: 5,
    permissions: ["galleries.index"],
  },
  {
    key: "cms-core-comments",
    name: "Comments",
    icon: "ti ti-message-circle",
    route: "/comments",
    priority: 6,
    permissions: ["comments.read"],
  },
  {
    key: "cms-core-contacts",
    name: "Contacts",
    icon: "ti ti-address-book",
    route: "/contacts",
    priority: 7,
    permissions: ["contacts.read"],
  },
  {
    key: "cms-core-member",
    name: "Members",
    icon: "ti ti-users",
    route: "/members",
    priority: 50,
    permissions: ["members.index"],
  },
  {
    key: "cms-plugins-custom-field",
    name: "Custom Fields",
    icon: "ti ti-forms",
    route: "/custom-fields",
    priority: 100,
    permissions: ["custom-fields.index"],
  },
  {
    key: "cms-core-media",
    name: "Media",
    icon: "ti ti-folder",
    route: "/media",
    priority: 999,
    permissions: ["media.index"],
  },
  {
    key: "cms-core-appearance",
    name: "Appearance",
    icon: "ti ti-brush",
    priority: 2000,
    permissions: ["menus.index"],
    childrenDisplay: "sidebar",
  },
  {
    key: "cms-core-tools",
    name: "Tools",
    icon: "ti ti-tool",
    priority: 9000,
    permissions: ["core.tools"],
    childrenDisplay: "sidebar",
  },
  {
    key: "cms-core-settings",
    name: "Settings",
    icon: "ti ti-settings",
    route: "/settings",
    priority: 9999,
    permissions: ["settings.common"],
    childrenDisplay: "panel",
  },
  {
    key: "cms-core-system",
    name: "Platform Administration",
    icon: "ti ti-user-shield",
    route: "/system",
    priority: 10000,
    permissions: ["core.system"],
    childrenDisplay: "panel",
  },

  // ─── Blog children ─────────────────────────────────
  {
    key: "cms-plugins-blog-post",
    name: "Posts",
    icon: "ti ti-file-text",
    route: "/blog/posts",
    priority: 10,
    permissions: ["posts.index"],
    parentKey: "cms-plugins-blog",
  },
  {
    key: "cms-plugins-blog-categories",
    name: "Categories",
    icon: "ti ti-folder",
    route: "/blog/categories",
    priority: 20,
    permissions: ["categories.index"],
    parentKey: "cms-plugins-blog",
  },
  {
    key: "cms-plugins-blog-tags",
    name: "Tags",
    icon: "ti ti-tag",
    route: "/blog/tags",
    priority: 30,
    permissions: ["tags.index"],
    parentKey: "cms-plugins-blog",
  },
  {
    key: "cms-plugins-blog-reports",
    name: "Reports",
    icon: "ti ti-chart-bar",
    route: "/blog/reports",
    priority: 40,
    permissions: ["reports.index"],
    parentKey: "cms-plugins-blog",
  },

  // ─── Appearance children ───────────────────────────
  {
    key: "cms-core-menu",
    name: "Menus",
    icon: "ti ti-tournament",
    route: "/appearance/menus",
    priority: 2,
    permissions: ["menus.index"],
    parentKey: "cms-core-appearance",
  },
  {
    key: "cms-core-admin-menu",
    name: "Admin Menus",
    icon: "ti ti-tournament",
    route: "/appearance/admin-menus",
    priority: 3,
    permissions: ["admin-menus.index"],
    parentKey: "cms-core-appearance",
  },

  // ─── Tools children ────────────────────────────────
  {
    key: "cms-tools-data-synchronize",
    name: "Data Synchronize",
    icon: "ti ti-arrows-exchange",
    route: "/tools/data-synchronize",
    priority: 10,
    permissions: ["tools.data-synchronize"],
    parentKey: "cms-core-tools",
  },
  {
    key: "cms-tools-webhooks",
    name: "Webhooks",
    icon: "ti ti-webhook",
    route: "/tools/webhooks",
    priority: 20,
    permissions: ["webhooks.read"],
    parentKey: "cms-core-tools",
  },

  // ─── Settings children (panel) ─────────────────────
  {
    key: "cms-settings-general",
    name: "General",
    description: "View and update general settings and activate license",
    icon: "ti ti-settings",
    route: "/settings/general",
    priority: 10,
    permissions: ["settings.common"],
    section: "General",
    parentKey: "cms-core-settings",
  },
  {
    key: "cms-settings-email-rules",
    name: "Email Rules",
    description: "Configure email rules for verification",
    icon: "ti ti-mail-check",
    route: "/settings/email-rules",
    priority: 20,
    permissions: ["settings.common"],
    section: "General",
    parentKey: "cms-core-settings",
  },
  {
    key: "cms-settings-media",
    name: "Media",
    description: "View and update media settings",
    icon: "ti ti-photo",
    route: "/settings/media",
    priority: 40,
    permissions: ["settings.common"],
    section: "General",
    parentKey: "cms-core-settings",
  },
  {
    key: "cms-settings-languages",
    name: "Languages",
    description: "View and update your website languages",
    icon: "ti ti-language",
    route: "/settings/languages",
    priority: 50,
    permissions: ["languages.index"],
    section: "General",
    parentKey: "cms-core-settings",
  },
  {
    key: "cms-settings-admin-appearance",
    name: "Admin Appearance",
    description: "View and update logo, favicon, layout, ...",
    icon: "ti ti-palette",
    route: "/settings/admin-appearance",
    priority: 60,
    permissions: ["settings.common"],
    section: "General",
    parentKey: "cms-core-settings",
  },
  {
    key: "cms-settings-cache",
    name: "Cache",
    description: "Configure cache for speed optimization",
    icon: "ti ti-database",
    route: "/settings/cache",
    priority: 70,
    permissions: ["settings.common"],
    section: "General",
    parentKey: "cms-core-settings",
  },

  // ─── System children (panel) ───────────────────────
  {
    key: "cms-system-users",
    name: "Users",
    description: "Manage admin users and their permissions",
    icon: "ti ti-user",
    route: "/system/users",
    priority: 10,
    permissions: ["users.index"],
    section: "Users & Permissions",
    parentKey: "cms-core-system",
  },
  {
    key: "cms-system-roles",
    name: "Roles & Permissions",
    description: "Manage roles and assign permissions",
    icon: "ti ti-lock",
    route: "/system/roles",
    priority: 20,
    permissions: ["roles.index"],
    section: "Users & Permissions",
    parentKey: "cms-core-system",
  },
  {
    key: "cms-system-audit-logs",
    name: "Audit Logs",
    description: "Track admin activities and changes",
    icon: "ti ti-clipboard-list",
    route: "/system/audit-logs",
    priority: 30,
    permissions: ["audit-log.index"],
    section: "Monitoring",
    parentKey: "cms-core-system",
  },
  {
    key: "cms-system-request-logs",
    name: "Request Logs",
    description: "Monitor API request logs and errors",
    icon: "ti ti-report-analytics",
    route: "/system/request-logs",
    priority: 40,
    permissions: ["request-log.index"],
    section: "Monitoring",
    parentKey: "cms-core-system",
  },
  {
    key: "cms-system-info",
    name: "System Information",
    description: "View system environment and configuration",
    icon: "ti ti-info-circle",
    route: "/system/info",
    priority: 50,
    permissions: ["system.info"],
    section: "System",
    parentKey: "cms-core-system",
  },
  {
    key: "cms-system-cache",
    name: "Cache Management",
    description: "Clear and manage application cache",
    icon: "ti ti-database",
    route: "/system/cache",
    priority: 60,
    permissions: ["system.cache"],
    section: "System",
    parentKey: "cms-core-system",
  },
];

// ── Seeder ────────────────────────────────────────────────────────────────────

export const AdminMenuSeeder: Seeder = {
  name: "Admin Menu",

  async run(prisma: PrismaClient) {
    // Step 1: Fetch all existing items in 1 query — build key → id map
    const existing = await prisma.adminMenuItem.findMany({
      select: { id: true, key: true },
    });
    const keyToId = new Map(existing.map((r) => [r.key, r.id]));

    // Process top-level items first (no parentKey), then children
    // so that parentId references are always resolved before children are inserted
    const ordered = [
      ...MENU_ITEMS.filter((i) => !i.parentKey),
      ...MENU_ITEMS.filter((i) => !!i.parentKey),
    ];

    const toCreate: typeof ordered = [];
    const toUpdate: Array<{ id: number; item: SeedItem; parentId: number | null }> = [];

    for (const item of ordered) {
      const parentId = item.parentKey ? (keyToId.get(item.parentKey) ?? null) : null;

      if (item.parentKey && parentId === null) {
        console.warn(`    ⚠  Parent "${item.parentKey}" not found for "${item.key}" — skipping`);
        continue;
      }

      const existingId = keyToId.get(item.key);

      if (existingId) {
        toUpdate.push({ id: existingId, item, parentId });
      } else {
        toCreate.push(item);
      }
    }

    // Step 2: Batch create new items (top-level first, then children in order)
    // Must be sequential (not createMany) because children need parent IDs
    for (const item of toCreate) {
      const parentId = item.parentKey ? (keyToId.get(item.parentKey) ?? null) : null;
      const record = await prisma.adminMenuItem.create({
        data: {
          key: item.key,
          name: item.name,
          description: item.description ?? null,
          icon: item.icon,
          route: item.route ?? null,
          permissions: item.permissions ?? [],
          childrenDisplay: item.childrenDisplay ?? "sidebar",
          section: item.section ?? null,
          priority: item.priority,
          parentId,
        },
        select: { id: true },
      });
      keyToId.set(item.key, record.id);
    }

    // Step 3: Batch all updates in a single transaction
    // Update structural fields only — NOT name (admin may have renamed via UI)
    if (toUpdate.length > 0) {
      await prisma.$transaction(
        toUpdate.map(({ id, item, parentId }) =>
          prisma.adminMenuItem.update({
            where: { id },
            data: {
              icon: item.icon,
              route: item.route ?? null,
              permissions: item.permissions ?? [],
              childrenDisplay: item.childrenDisplay ?? "sidebar",
              section: item.section ?? null,
              priority: item.priority,
              parentId,
            },
          }),
        ),
      );
    }

    console.log(`    → ${toCreate.length} created, ${toUpdate.length} updated`);
  },
};
