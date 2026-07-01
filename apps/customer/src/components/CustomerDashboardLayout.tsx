"use client";

import { useI18n } from "@ecom/shared/@i18n";
import { LanguageSwitcher } from "@ecom/shared/components/LanguageSwitcher";
import { ThemeToggle } from "@ecom/shared/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { cn } from "@ecom/ui/lib/utils";
import { ChevronDown, LayoutDashboard, LogOut, PanelLeft, User as UserIcon } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { type ReactNode, useEffect, useState } from "react";
import { trpc } from "../lib/trpc";

interface CustomerDashboardLayoutProps {
  children: ReactNode;
}

export function CustomerDashboardLayout({ children }: CustomerDashboardLayoutProps) {
  const pathname = usePathname();
  const { status } = useSession();
  const { languageId: currentLocale } = useI18n();

  // Sidebar States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive Breakpoint Detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg
      setIsMobile(mobile);
      if (mobile) {
        setMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch real-time customer profile
  const { data: profile } = trpc.customer.auth.me.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const displayName = profile?.name ?? profile?.email?.split("@")[0] ?? "Customer";
  const email = profile?.email ?? "";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  // Sidebar navigation menu items
  const menuItems = [
    {
      label: currentLocale === "vi" ? "Tổng quan" : "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: currentLocale === "vi" ? "Hồ sơ cá nhân" : "Personal Profile",
      href: "/profile",
      icon: UserIcon,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--sidebar-bg)] text-foreground">
      {/* Brand Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 px-5 md:h-16">
        <span className="text-xl">⚡</span>
        <div className="flex flex-col gap-0.5 text-left">
          <span className="text-sm font-semibold leading-none tracking-tight">Ecom</span>
          <span className="text-[12px] font-semibold leading-none text-muted-foreground">
            Customer
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-6 overflow-y-auto">
        <nav className="flex flex-col gap-0.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <NextLink
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[var(--sidebar-item-active)] text-[var(--sidebar-item-active-text)]"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon
                  className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")}
                  strokeWidth={1.8}
                />
                <span className="truncate">{item.label}</span>
              </NextLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile dropdown */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent text-left focus:outline-none"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            alignOffset={0}
            sideOffset={8}
            className="w-56 z-[9999]"
            style={{ zIndex: 9999 }}
          >
            <DropdownMenuItem asChild>
              <NextLink href="/profile" className="flex items-center gap-2 cursor-pointer w-full">
                <UserIcon className="h-4 w-4" />
                {currentLocale === "vi" ? "Thông tin cá nhân" : "Personal Info"}
              </NextLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {currentLocale === "vi" ? "Đăng xuất" : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            "sticky top-0 z-40 h-screen w-[var(--sidebar-width)] shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-transform duration-300 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          style={{
            marginRight: sidebarOpen ? 0 : "calc(-1 * var(--sidebar-width))",
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Sidebar backdrop */}
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-300 cursor-default"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] shadow-xl transition-transform duration-300 ease-out bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        {/* Toolbar Header */}
        <header className="sticky top-0 z-30 flex h-12 md:h-16 items-center bg-background px-2 md:px-4">
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => (isMobile ? setMobileOpen(!mobileOpen) : setSidebarOpen(!sidebarOpen))}
              className="flex cursor-pointer size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Toggle sidebar"
            >
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>

            <div className="hidden lg:block h-6 w-px bg-border" />
          </div>

          <div className="flex items-center gap-0.5">
            <LanguageSwitcher />
            <ThemeToggle storageKey="customer-theme" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
