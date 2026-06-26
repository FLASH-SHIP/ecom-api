"use client";

import type { FlatNavItemType, NavItemType } from "@app/core/navigation/types/NavItemType";
import useUser from "@auth/useUser";
import useNavigationItems from "@ecom/shared/components/theme-layouts/components/navigation/hooks/useNavigationItems";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { PerfectScroll } from "@ecom/ui/components/perfect-scroll";
import { cn } from "@ecom/ui/lib/utils";
import { ChevronDown, ChevronRight, LogOut, User as UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  Fragment,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAdminSidebar } from "./AdminSidebarContext";
import { getNavIcon } from "./nav-icons";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus within a container element — cycles focus between first and last focusable.
 */
function trapTabFocus(e: KeyboardEvent, container: HTMLElement) {
  const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Resolves the translated label for a nav item.
 * Uses the translate key (e.g. "nav.dashboard") if present, otherwise falls back to item.title.
 */
function useNavLabel(item: NavItemType): string {
  const t = useTranslations("nav");
  if (!item.translate) return item.title ?? "";

  const key = item.translate.startsWith("nav.") ? item.translate.slice(4) : item.translate;
  try {
    return t(key as Parameters<typeof t>[0]);
  } catch {
    return item.title ?? "";
  }
}

/**
 * Find the navigation item URL that is the longest matching prefix for the current pathname.
 * This prevents parent-level URLs (e.g. /customers) from being highlighted when a more specific
 * peer URL (e.g. /customers/verification-codes) is active.
 */
function getActiveUrl(pathname: string, items: FlatNavItemType[]): string | null {
  let activeUrl: string | null = null;
  let maxLength = 0;

  for (const item of items) {
    const url = item.url;
    if (!url) continue;

    const isMatch = item.end
      ? pathname === url
      : pathname === url || (url !== "/" && pathname.startsWith(url + "/"));

    if (isMatch && url.length > maxLength) {
      maxLength = url.length;
      activeUrl = url;
    }
  }

  if (!activeUrl) {
    for (const item of items) {
      const url = item.url;
      if (!url) continue;

      const isMatch = item.end
        ? pathname === url
        : pathname === url || (url !== "/" && pathname.startsWith(url));

      if (isMatch && url.length > maxLength) {
        maxLength = url.length;
        activeUrl = url;
      }
    }
  }

  return activeUrl;
}

const ActiveUrlContext = createContext<string | null>(null);

/**
 * Single navigation item (type="item")
 */
function NavItem({ item }: { item: NavItemType }) {
  const activeUrl = useContext(ActiveUrlContext);
  const url = item.url ?? "#";
  const isActive = activeUrl === url;
  const Icon = getNavIcon(item.icon as string);
  const label = useNavLabel(item);

  return (
    <Link
      href={url}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {Icon && (
        <Icon
          className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")}
          strokeWidth={1.8}
        />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

/**
 * Collapsible navigation item (type="collapse")
 */
function NavCollapse({ item }: { item: NavItemType }) {
  const activeUrl = useContext(ActiveUrlContext);
  const [open, setOpen] = useState(() => {
    return (
      item.children?.some((child) => {
        const url = child.url ?? "";
        return activeUrl === url;
      }) ?? false
    );
  });
  const Icon = getNavIcon(item.icon as string);
  const label = useNavLabel(item);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-accent-foreground"
      >
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />}
        <span className="flex-1 truncate text-left">{label}</span>
        {open ? (
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        ) : (
          <ChevronRight className="size-4 shrink-0 opacity-50" />
        )}
      </button>
      {open && item.children && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
          {item.children
            .filter((child) => child.hasPermission !== false)
            .map((child) => (
              <NavItem key={child.id} item={child} />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Navigation group header (type="group")
 */
function NavGroup({ item }: { item: NavItemType }) {
  const label = useNavLabel(item);

  return (
    <div className="flex flex-col gap-0.5">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--sidebar-section-text)]">
        {label}
      </p>
      {item.children
        ?.filter((child) => child.hasPermission !== false)
        .map((child) => (
          <Fragment key={child.id}>
            {child.type === "collapse" ? <NavCollapse item={child} /> : <NavItem item={child} />}
          </Fragment>
        ))}
    </div>
  );
}

/**
 * Sidebar content — logo, navigation, user menu
 */
function SidebarContent() {
  const { data: navigation, flattenData } = useNavigationItems();
  const pathname = usePathname();
  const { data: user, signOut } = useUser();
  const tAuth = useTranslations("auth");
  const tUsers = useTranslations("users");

  const activeUrl = useMemo(() => {
    if (!flattenData) return null;
    return getActiveUrl(pathname, flattenData);
  }, [pathname, flattenData]);

  return (
    <ActiveUrlContext.Provider value={activeUrl}>
      <div className="flex h-full flex-col overflow-hidden bg-[var(--sidebar-bg)]">
        {/* Logo header */}
        <div className="flex h-12 shrink-0 items-center gap-2 px-5 md:h-16">
          <Image className="size-6" src="/favicon.ico" alt="Ecom" width={24} height={24} />
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-semibold leading-none tracking-tight">Ecom</span>
            <span className="text-[12px] font-semibold leading-none text-muted-foreground">
              CMS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <PerfectScroll className="flex-1 px-3 py-4 flex flex-col gap-6">
          {navigation?.map((group) => (
            <NavGroup key={group.id} item={group} />
          ))}
        </PerfectScroll>

        {/* User menu with profile + logout */}
        {user && (
          <div className="border-t border-[var(--sidebar-border)] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                    {user.displayName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex min-w-0 flex-col text-left">
                    <span className="truncate text-sm font-semibold">{user.displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href={`/system/users/profile/${user.id}`}>
                    <UserIcon className="mr-2 size-4" />
                    {tUsers("profile.title")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  {tAuth("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </ActiveUrlContext.Provider>
  );
}

/**
 * AdminSidebar — sidebar (width from --sidebar-width) replicating the admin layout NavbarStyle1.
 *
 * Desktop: sticky sidebar with GPU-accelerated open/close animation (translateX).
 * Mobile: overlay drawer with slide animation, backdrop, Escape key support,
 *         and focus trap for accessibility.
 */
function AdminSidebar() {
  const { isOpen, isMobile, isMobileOpen, closeMobile } = useAdminSidebar();
  const drawerRef = useRef<HTMLElement>(null);

  // Focus trap + Escape key for mobile drawer
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    // Focus the drawer on open
    const firstFocusable = drawer.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMobile();
        return;
      }

      if (e.key === "Tab" && drawer) {
        trapTabFocus(e, drawer);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isMobileOpen, closeMobile]);

  return (
    <>
      {/* Desktop sidebar — GPU-accelerated with transform */}
      {!isMobile && (
        <aside
          className={cn(
            "sticky top-0 z-sidebar h-screen w-[var(--sidebar-width)] shrink-0 border-r border-[var(--sidebar-border)] transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "-translate-x-full",
          )}
          style={{
            marginRight: isOpen ? 0 : "calc(-1 * var(--sidebar-width))",
          }}
        >
          <SidebarContent />
        </aside>
      )}

      {/* Mobile backdrop — always rendered, animated with opacity */}
      {isMobile && (
        <button
          type="button"
          aria-label="Close sidebar"
          aria-hidden={!isMobileOpen}
          className={cn(
            "fixed inset-0 z-overlay bg-black/50 transition-opacity duration-300 cursor-default",
            isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={closeMobile}
          tabIndex={-1}
        />
      )}

      {/* Mobile drawer — always rendered, animated with translateX */}
      {isMobile && (
        <aside
          ref={drawerRef}
          aria-label="Navigation sidebar"
          aria-hidden={!isMobileOpen}
          inert={!isMobileOpen ? true : undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-modal w-[var(--sidebar-width)] shadow-xl transition-transform duration-300 ease-out",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent />
        </aside>
      )}
    </>
  );
}

export default memo(AdminSidebar);
