import {
  Activity,
  ClipboardList,
  DatabaseBackup,
  File,
  FileText,
  FolderTree,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Mail,
  Menu,
  MessageCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  UserCheck,
  Users,
  Webhook,
  Wrench,
} from "lucide-react";

/**
 * Map Admin-style icon strings ("lucide:icon-name") to actual Lucide components.
 * Shared between AdminSidebar and AdminToolbar.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  file: File,
  "file-text": FileText,
  "folder-tree": FolderTree,
  tag: Tag,
  image: ImageIcon,
  "user-check": UserCheck,
  "shopping-bag": ShoppingBag,
  "message-circle": MessageCircle,
  mail: Mail,
  "sliders-horizontal": SlidersHorizontal,
  menu: Menu,
  wrench: Wrench,
  settings: Settings,
  "shield-check": ShieldCheck,
  webhook: Webhook,
  "refresh-cw": RefreshCw,
  users: Users,
  lock: Lock,
  "clipboard-list": ClipboardList,
  activity: Activity,
  "database-backup": DatabaseBackup,
  info: Info,
};

export function getNavIcon(icon?: string): LucideIcon | null {
  if (!icon) return null;
  const name = icon.replace("lucide:", "");
  return ICON_MAP[name] ?? null;
}
