"use client";

import type { NavItemType } from "@ecom/shared/@app/core/navigation/types/NavItemType";
import useNavigationItems from "@ecom/shared/components/theme-layouts/components/navigation/hooks/useNavigationItems";
import { Breadcrumb } from "@ecom/ui/components/breadcrumb";
import { cn } from "@ecom/ui/lib/utils";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface PageBreadcrumbProps {
  className?: string;
  skipHome?: boolean;
}

// Recursively find nav item by URL
function getNavigationItem(url: string, navigationItems: NavItemType[]): NavItemType | null {
  for (const item of navigationItems) {
    if (item.url === url) return item;
    if (item.children) {
      const child = getNavigationItem(url, item.children);
      if (child) return child;
    }
  }
  return null;
}

/**
 * Automatic page breadcrumb — matches the admin demo exactly.
 *
 * Auto-generates crumbs from the current pathname, resolving titles
 * from the navigation config. Renders a bordered pill matching the
 * theme visual style.
 *
 * Usage (no props needed in most cases):
 * ```tsx
 * <PageBreadcrumb className="mb-2" />
 * ```
 */
function PageBreadcrumb({ className, skipHome = false }: PageBreadcrumbProps) {
  const pathname = usePathname();
  const { data: navigation } = useNavigationItems();
  const t = useTranslations("nav");

  const items = useMemo(() => {
    const resolveLabel = (item: NavItemType | null, fallback: string): string => {
      if (!item) return fallback;
      if (!item.translate) return item.title ?? fallback;
      const key = item.translate.startsWith("nav.") ? item.translate.slice(4) : item.translate;
      try {
        return t(key as Parameters<typeof t>[0]);
      } catch {
        return item.title ?? fallback;
      }
    };

    return pathname
      .split("/")
      .filter(Boolean)
      .reduce(
        (acc: { label: string; href?: string }[], part, index, array) => {
          const url = `/${array.slice(0, index + 1).join("/")}`;
          const navItem = getNavigationItem(url, navigation);
          const label = resolveLabel(navItem, part.charAt(0).toUpperCase() + part.slice(1));
          acc.push({ label, href: url });
          return acc;
        },
        skipHome ? [] : [{ label: "Home", href: "/" }],
      );
  }, [pathname, navigation, skipHome, t]);

  return (
    <Breadcrumb
      items={items}
      className={cn("w-fit rounded-sm border border-border px-2", className)}
    />
  );
}

export default PageBreadcrumb;
