"use client";

// Inline cn utility — avoids @ecom/ui dependency (SidebarNav kept for reference, replaced by Navigation)
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

import {
  Activity,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Boxes,
  ChevronLeft,
  FileText,
  FolderTree,
  Grid3X3,
  Image,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Menu,
  MessageCircle,
  ScrollText,
  Settings,
  Shield,
  UserCheck,
  Users,
  Webhook,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  posts: FileText,
  pages: BookOpen,
  categories: FolderTree,
  tags: Grid3X3,
  media: Image,
  templates: Boxes,
  users: Users,
  roles: Shield,
  members: UserCheck,
  comments: MessageCircle,
  contacts: Mail,
  "custom-fields": Wrench,
  taxonomies: FolderTree,
  "admin-menus": Menu,
  settings: Settings,
  system: Activity,
  "audit-logs": ScrollText,
  tools: Wrench,
  webhooks: Webhook,
  redirects: ArrowRightLeft,
  notifications: Bell,
};

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={cn(
        "flex flex-1 flex-col overflow-hidden transition-all duration-300",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-full",
      )}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? FileText;
                const isActive =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-primary")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
    </nav>
  );
}
