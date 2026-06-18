import type { NavBadgeType } from "./NavBadgeType";

/**
 * Legacy style prop placeholder — used only by dead nav components.
 */
type SxProps = Record<string, unknown>;

/**
 * NavItemType
 * A type for navigation item and its properties.
 */
export type NavItemType = {
  id: string;
  title?: string;
  translate?: string;
  auth?: string[] | string;
  subtitle?: string;
  icon?: string;
  iconClass?: string;
  url?: string;
  target?: string;
  type?: string;
  sx?: SxProps;
  disabled?: boolean;
  active?: boolean;
  exact?: boolean;
  end?: boolean;
  badge?: NavBadgeType;
  children?: NavItemType[];
  hasPermission?: boolean;
};

export type FlatNavItemType = Omit<NavItemType, "children" | "sx"> & {
  children?: string[];
  order: string;
};
