"use client";

import {
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  User,
  X,
} from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearTokens, isLoggedIn } from "../lib/auth";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Blog", href: "/blog", icon: FileText },
  { label: "Trang", href: "/pages", icon: Newspaper },
  { label: "Liên hệ", href: "/contact", icon: Mail },
];

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => typeof window !== "undefined" && isLoggedIn());
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const cleanPathname = pathname.startsWith(`/${currentLocale}/`)
    ? pathname.slice(currentLocale.length + 1)
    : pathname === `/${currentLocale}`
      ? "/"
      : pathname;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  function handleLogout() {
    clearTokens();
    setLoggedIn(false);
    setAvatarOpen(false);
    router.push(getLocalizedHref("/"));
  }

  // Close avatar menu on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [avatarOpen]);

  return (
    <>
      {/* AppBar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:h-16">
          {/* Logo */}
          <NextLink
            href={getLocalizedHref("/")}
            className="flex shrink-0 items-center gap-1 text-xl font-extrabold tracking-tight text-primary no-underline"
          >
            ⚡ Ecom
          </NextLink>

          {/* Desktop nav */}
          <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                cleanPathname === item.href ||
                (item.href !== "/" && cleanPathname.startsWith(item.href));
              return (
                <NextLink
                  key={item.href}
                  href={getLocalizedHref(item.href)}
                  className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "font-bold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  } after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-3/5 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-transform ${
                    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
                  }`}
                >
                  {item.label}
                </NextLink>
              );
            })}
          </nav>

          <div className="flex-1 md:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {loggedIn ? (
              <div className="relative hidden sm:block">
                <button
                  ref={avatarRef}
                  type="button"
                  onClick={() => setAvatarOpen((o) => !o)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                  aria-label="Tài khoản"
                >
                  M
                </button>
                {avatarOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-background py-1 shadow-xl"
                  >
                    <NextLink
                      href={getLocalizedHref("/customer/dashboard")}
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </NextLink>
                    <NextLink
                      href={getLocalizedHref("/customer/profile")}
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                    >
                      <User className="h-4 w-4" /> Hồ sơ
                    </NextLink>
                    <hr className="my-1 border-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <NextLink
                  href={getLocalizedHref("/auth/login")}
                  className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-muted sm:inline-flex"
                >
                  <User className="h-4 w-4" /> Đăng nhập
                </NextLink>
                <NextLink
                  href={getLocalizedHref("/auth/register")}
                  className="hidden rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-md sm:inline-flex"
                >
                  Đăng ký
                </NextLink>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 hover:bg-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer overlay */}
      {drawerOpen && (
        <>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: click-away backdrop with role=presentation */}
          <div
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <aside className="fixed inset-y-0 right-0 z-[70] w-[260px] bg-background shadow-2xl">
            <div className="flex items-center justify-between p-4">
              <span className="text-lg font-extrabold text-primary">⚡ Ecom</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1 hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <hr className="border-border" />
            <nav className="py-2">
              {NAV_ITEMS.map((item) => {
                const active =
                  cleanPathname === item.href ||
                  (item.href !== "/" && cleanPathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <NextLink
                    key={item.href}
                    href={getLocalizedHref(item.href)}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-primary/5 font-semibold text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NextLink>
                );
              })}
            </nav>
            <hr className="border-border" />
            <div className="flex flex-col gap-2 p-4">
              <LanguageSwitcher />
              {loggedIn ? (
                <>
                  <NextLink
                    href={getLocalizedHref("/customer/dashboard")}
                    onClick={() => setDrawerOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </NextLink>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <NextLink
                    href={getLocalizedHref("/auth/login")}
                    onClick={() => setDrawerOpen(false)}
                    className="flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Đăng nhập
                  </NextLink>
                  <NextLink
                    href={getLocalizedHref("/auth/register")}
                    onClick={() => setDrawerOpen(false)}
                    className="flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Đăng ký
                  </NextLink>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function Footer() {
  const pathname = usePathname();
  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  return (
    <footer className="mt-auto border-t border-border bg-muted/50 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-2 text-lg font-extrabold text-primary">⚡ Ecom</h3>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Nền tảng all-in-one giúp bạn chia sẻ kiến thức và kết nối cộng đồng.
            </p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold">Khám phá</h4>
            {NAV_ITEMS.map((item) => (
              <NextLink
                key={item.href}
                href={getLocalizedHref(item.href)}
                className="mb-1.5 block text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </NextLink>
            ))}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold">Tài khoản</h4>
            <NextLink
              href={getLocalizedHref("/auth/login")}
              className="mb-1.5 block text-sm text-muted-foreground hover:text-foreground"
            >
              Đăng nhập
            </NextLink>
            <NextLink
              href={getLocalizedHref("/auth/register")}
              className="mb-1.5 block text-sm text-muted-foreground hover:text-foreground"
            >
              Đăng ký
            </NextLink>
            <NextLink
              href={getLocalizedHref("/customer/dashboard")}
              className="mb-1.5 block text-sm text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </NextLink>
          </div>
        </div>

        <hr className="my-8 border-border" />

        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ecom. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
