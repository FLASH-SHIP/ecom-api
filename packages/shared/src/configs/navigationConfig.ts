import type { NavItemType } from "../@app/core/navigation/types/NavItemType";

/**
 * CMS Navigation Configuration for Ecom Admin.
 *
 * Follows the Botble CMS sidebar convention:
 *  - Content items at the top
 *  - Engagement in the middle
 *  - Utilities + Settings
 *  - "Quản trị hệ thống" as a direct link to /system (Tổng quan page)
 *
 * Uses lucide: icon prefix — the only icon set supported by icon.
 */
const navigationConfig: NavItemType[] = [
  // ── General ─────────────────────────────────────────────────────
  {
    id: "general",
    title: "General",
    translate: "nav.general",
    type: "group",
    children: [
      {
        id: "dashboard",
        title: "Bảng điều khiển",
        translate: "nav.dashboard",
        type: "item",
        icon: "lucide:layout-dashboard",
        url: "/",
        end: true,
      },
    ],
  },

  // ── Content ─────────────────────────────────────────────────────
  {
    id: "content",
    title: "Nội dung",
    translate: "nav.content",
    type: "group",
    children: [
      {
        id: "pages",
        title: "Trang",
        translate: "nav.pages",
        type: "item",
        icon: "lucide:file",
        url: "/pages",
      },
      {
        id: "posts",
        title: "Blog",
        translate: "nav.posts",
        type: "item",
        icon: "lucide:file-text",
        url: "/posts",
      },
      {
        id: "categories",
        title: "Danh mục",
        translate: "nav.categories",
        type: "item",
        icon: "lucide:folder-tree",
        url: "/categories",
      },
      {
        id: "tags",
        title: "Thẻ",
        translate: "nav.tags",
        type: "item",
        icon: "lucide:tag",
        url: "/tags",
      },
      {
        id: "media",
        title: "Thư viện ảnh",
        translate: "nav.media",
        type: "item",
        icon: "lucide:image",
        url: "/media",
      },
    ],
  },

  // ── Engagement ───────────────────────────────────────────────────
  {
    id: "engagement",
    title: "Tương tác",
    translate: "nav.engagement",
    type: "group",
    children: [
      {
        id: "customers",
        title: "Khách hàng",
        translate: "nav.customers",
        type: "item",
        icon: "lucide:user-check",
        url: "/customers",
      },
      {
        id: "verification-codes",
        title: "Lịch sử gửi mã",
        translate: "nav.verificationCodes",
        type: "item",
        icon: "lucide:clipboard-list",
        url: "/customers/verification-codes",
      },
      {
        id: "comments",
        title: "Bình luận",
        translate: "nav.comments",
        type: "item",
        icon: "lucide:message-circle",
        url: "/comments",
      },
      {
        id: "contacts",
        title: "Liên hệ",
        translate: "nav.contacts",
        type: "item",
        icon: "lucide:mail",
        url: "/contacts",
      },
    ],
  },

  // ── Utilities ────────────────────────────────────────────────────
  {
    id: "utilities",
    title: "Tiện ích",
    translate: "nav.utilities",
    type: "group",
    children: [
      {
        id: "custom-fields",
        title: "Trường tùy chỉnh",
        translate: "nav.customFields",
        type: "item",
        icon: "lucide:sliders-horizontal",
        url: "/custom-fields",
      },
      {
        id: "menus",
        title: "Menu",
        translate: "nav.menus",
        type: "item",
        icon: "lucide:menu",
        url: "/menus",
      },
      {
        id: "tools",
        title: "Công cụ",
        translate: "nav.tools",
        type: "collapse",
        icon: "lucide:wrench",
        children: [
          {
            id: "tools-webhooks",
            title: "Webhooks",
            translate: "nav.webhooks",
            type: "item",
            icon: "lucide:webhook",
            url: "/tools/webhooks",
          },
          {
            id: "tools-data-sync",
            title: "Đồng bộ dữ liệu",
            translate: "nav.dataSync",
            type: "item",
            icon: "lucide:refresh-cw",
            url: "/tools/data-synchronize",
          },
        ],
      },
      {
        id: "settings",
        title: "Cài đặt",
        translate: "nav.settings",
        type: "item",
        icon: "lucide:settings",
        url: "/settings",
      },
    ],
  },

  // ── Platform Administration — Botble-style collapsible at bottom ──
  {
    id: "admin-group",
    title: "Quản trị",
    translate: "nav.adminGroup",
    type: "group",
    children: [
      {
        id: "system",
        title: "Quản trị hệ thống",
        translate: "nav.platformAdmin",
        type: "item",
        icon: "lucide:shield-check",
        url: "/system",
        end: true,
        // Children are intentionally NOT rendered on sidebar (type:"item" ignores children in NavVerticalItemBase),
        // but flattenNavigation() recurses into them — so they remain discoverable in search and shortcuts.
        children: [
          {
            id: "system-users",
            title: "Người dùng",
            translate: "nav.users",
            type: "item",
            icon: "lucide:users",
            url: "/system/users",
          },
          {
            id: "system-roles",
            title: "Nhóm và phân quyền",
            translate: "nav.roles",
            type: "item",
            icon: "lucide:lock",
            url: "/system/roles",
          },
          {
            id: "system-audit-logs",
            title: "Nhật ký hoạt động",
            translate: "nav.auditLogs",
            type: "item",
            icon: "lucide:clipboard-list",
            url: "/system/audit-logs",
          },
          {
            id: "system-request-logs",
            title: "Nhật ký truy vấn",
            translate: "nav.requestLogs",
            type: "item",
            icon: "lucide:activity",
            url: "/system/request-logs",
          },
          {
            id: "system-cache",
            title: "Quản lý bộ nhớ đệm",
            translate: "nav.systemCache",
            type: "item",
            icon: "lucide:database-backup",
            url: "/system/cache",
          },
          {
            id: "system-info",
            title: "Thông tin hệ thống",
            translate: "nav.systemInfo",
            type: "item",
            icon: "lucide:info",
            url: "/system/info",
          },
        ],
      },
    ],
  },
];

export default navigationConfig;
