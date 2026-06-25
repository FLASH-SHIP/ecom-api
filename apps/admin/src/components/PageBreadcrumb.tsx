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
  items?: { label: string; href?: string }[];
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

function getActionLabel(segment: string, commonT: (key: string) => string): string | null {
  const lower = segment.toLowerCase();
  if (lower === "edit") {
    try {
      return commonT("detail");
    } catch {
      return "Detail";
    }
  }
  if (lower === "create") {
    try {
      return commonT("create");
    } catch {
      return "Create";
    }
  }
  return null;
}

function resolveLabel(
  item: NavItemType | null,
  segment: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
): string {
  if (!item) {
    return getActionLabel(segment, commonT) ?? segment.charAt(0).toUpperCase() + segment.slice(1);
  }
  if (!item.translate) return item.title ?? segment;
  const key = item.translate.startsWith("nav.") ? item.translate.slice(4) : item.translate;
  try {
    return t(key as Parameters<typeof t>[0]);
  } catch {
    return item.title ?? segment;
  }
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
function PageBreadcrumb({ className, skipHome = false, items: customItems }: PageBreadcrumbProps) {
  const pathname = usePathname();
  const { data: navigation } = useNavigationItems();
  const t = useTranslations("nav");
  const commonT = useTranslations("common");

  const items = useMemo(() => {
    const homeLabel = (() => {
      try {
        return t("dashboard") || "Dashboard";
      } catch {
        return "Dashboard";
      }
    })();

    if (customItems) {
      return skipHome ? customItems : [{ label: homeLabel, href: "/" }, ...customItems];
    }

    const segments = pathname.split("/").filter(Boolean);
    const filteredSegments = segments.filter((part) => {
      // Skip ID segments: CUID (24-32 chars), UUID (36 chars), or numeric ID
      const isId = /^[a-z0-9-]{20,}$/i.test(part) || /^\d+$/.test(part);
      return !isId;
    });

    return filteredSegments.reduce(
      (acc: { label: string; href?: string }[], part) => {
        const originalIndex = segments.indexOf(part);
        const url = `/${segments.slice(0, originalIndex + 1).join("/")}`;
        const navItem = getNavigationItem(url, navigation);
        const label = resolveLabel(navItem, part, t, commonT);
        acc.push({ label, href: url });
        return acc;
      },
      skipHome ? [] : [{ label: homeLabel, href: "/" }],
    );
  }, [pathname, navigation, skipHome, t, commonT, customItems]);

  return (
    <Breadcrumb
      items={items}
      className={cn("w-fit rounded-sm border border-border px-2", className)}
    />
  );
}

export default PageBreadcrumb;
