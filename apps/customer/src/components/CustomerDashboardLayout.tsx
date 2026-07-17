"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { ThemeToggle } from "@ecom/shared/components/ThemeToggle";
import { Button } from "@ecom/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { SidebarToggleIcon } from "@ecom/ui/components/icon-component/SidebarToggleIcon";
import { UserAvatarIcon } from "@ecom/ui/components/icon-component/UserAvatarIcon";
import { WalletSolidIcon } from "@ecom/ui/components/icon-component/WalletSolidIcon";
import { MenuIcon } from "@ecom/ui/components/icons";
import { cn } from "@ecom/ui/lib/utils";
import { Bell, ChevronDown, LogOut, PanelLeft, User as UserIcon } from "lucide-react";
import NextImage from "next/image";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { type ReactNode, useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { CustomerSidebar } from "./CustomerSidebar";

interface CustomerDashboardLayoutProps {
  children: ReactNode;
}

export function CustomerDashboardLayout({ children }: CustomerDashboardLayoutProps) {
  const _pathname = usePathname();
  const router = useRouter();
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

  // Handle expired sessions / tokens by signing out and redirecting to login page
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    } else if (status === "authenticated" && profile === null) {
      signOut({ callbackUrl: "/auth/login" });
    }
  }, [status, profile, router]);

  const displayName = profile?.name ?? profile?.email?.split("@")[0] ?? "Customer";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      {/* Toolbar Header */}
      <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-background px-6">
        {/* Left Branding & Toggle */}
        <div className="flex items-center gap-4">
          <NextLink href="/dashboard" className="flex items-center">
            {/* Desktop Long Logo */}
            <NextImage
              src="/assets/images/logo/ecom-express-long.svg"
              alt="EcomExpress"
              width={198}
              height={38}
              priority
              className="hidden lg:block h-9.5 w-auto object-contain"
            />
            {/* Mobile Short Logo */}
            <NextImage
              src="/assets/images/logo/ecom-express-short.svg"
              alt="EcomExpress"
              width={30}
              height={36}
              priority
              className="block lg:hidden h-9.5 w-auto object-contain"
            />
          </NextLink>

          <div className={"hidden lg:block"}>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => (isMobile ? setMobileOpen(!mobileOpen) : setSidebarOpen(!sidebarOpen))}
              className="flex lg:hidden cursor-pointer size-9 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Toggle sidebar"
            >
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Button>
          </div>
        </div>

        {/* Right Tools (Theme, Wallet, Notification, Account Dropdown) */}
        <div className="flex items-center gap-3">
          <div className={"hidden lg:block"}>
            <ThemeToggle storageKey="customer-theme" />
          </div>

          {/* Wallet */}
          <div className="hidden lg:flex items-center gap-2 rounded-md bg-[#CFFEF9] dark:bg-teal-950/40 px-3 py-[7px] text-sm font-semibold text-[#0F798C] dark:text-teal-200 border border-transparent dark:border-teal-800/30 cursor-pointer">
            <WalletSolidIcon />
            <span>$164,250</span>
          </div>

          {/* Notification */}
          <div className={"hidden lg:block"}>
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-md bg-[#CFFEF9] dark:bg-teal-950/40 text-[#0F798C] dark:text-teal-200 border border-transparent dark:border-teal-800/30 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Bell className="size-4 shrink-0" strokeWidth={2} />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-background dark:ring-teal-950" />
            </button>
          </div>

          {/* User Account Dropdown */}
          <div className={"hidden lg:block"}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md bg-[#CFFEF9] dark:bg-teal-950/40 px-3 py-[7px] text-sm font-semibold text-[#0F798C] dark:text-teal-200 border border-transparent dark:border-teal-800/30 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer text-left"
                >
                  <UserAvatarIcon />
                  <span className="truncate max-w-[120px] text-sys-primary dark:text-teal-200 font-medium">
                    {displayName}
                  </span>
                  <ChevronDown className="size-3.5 text-[#0F798C] dark:text-teal-200 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1 z-[9999]">
                <DropdownMenuItem asChild>
                  <NextLink
                    href="/profile/change-password"
                    className="flex items-center gap-2 cursor-pointer w-full text-sm"
                  >
                    <UserIcon className="h-4 w-4" />
                    {translate("customerDashboard.changePassword", currentLocale)}
                  </NextLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  {translate("customerDashboard.logout", currentLocale)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setMobileOpen(true)}
            className="border border-sys-border rounded-md flex items-center justify-center lg:hidden cursor-pointer h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <MenuIcon />
          </Button>
        </div>
      </header>

      {/* Main body (Sidebar + Content) */}
      <div className="flex flex-1 w-full relative">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside
            className={cn(
              "sticky top-[72px] z-40 h-[calc(100vh-72px)] shrink-0 border-r border-sys-border dark:border-zinc-800 bg-[var(--sidebar-bg)] shadow-[1px_0_8px_rgba(0,0,0,0.05)] dark:shadow-none transition-all duration-300 ease-out",
              sidebarOpen ? "w-[var(--sidebar-width)]" : "w-18",
            )}
          >
            <CustomerSidebar isCollapsed={!sidebarOpen} />

            {/* Floating Sidebar Toggle Button for Desktop */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "absolute top-6 z-50 transition-all duration-300 ease-out focus:outline-none hover:scale-105 active:scale-95 cursor-pointer",
                sidebarOpen ? "left-[calc(var(--sidebar-width)-12px)]" : "left-[60px]",
              )}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <SidebarToggleIcon isOpen={sidebarOpen} className="size-6 drop-shadow-sm" />
            </button>
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
              "fixed inset-y-0 left-0 z-50 w-full shadow-xl transition-transform duration-300 ease-out bg-[var(--sidebar-bg)]",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <CustomerSidebar
              isCollapsed={false}
              isDrawer={true}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        )}

        {/* Content Area */}
        <div className="flex flex-1 flex-col min-w-0 relative">
          <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
