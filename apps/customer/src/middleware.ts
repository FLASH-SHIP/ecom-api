import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * i18n middleware for locale-prefixed URLs.
 *
 * Locale resolution priority:
 *   1. URL path prefix (/vi/..., /en/...)
 *   2. NEXT_LOCALE cookie (set by LanguageSwitcher for returning visitors)
 *   3. Accept-Language header (browser preference for first-time visitors)
 *   4. DEFAULT_LOCALE fallback
 *
 * Skip paths: /api, /_next, static assets.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cleanPathname = pathname;
  const normalizedPath = cleanPathname.startsWith("/") ? cleanPathname.slice(1) : cleanPathname;

  // Session token cookie check (Edge compatible)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;
  const isLoggedIn = !!sessionToken;

  // Auth route protection
  if (
    normalizedPath.startsWith("dashboard/") ||
    normalizedPath === "dashboard" ||
    normalizedPath.startsWith("profile/") ||
    normalizedPath === "profile"
  ) {
    if (!isLoggedIn) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      // Preserve search params (e.g. callbackUrl) if any
      return NextResponse.redirect(loginUrl);
    }
  }

  if (normalizedPath.startsWith("auth/") || normalizedPath === "auth") {
    // If accessing auth page but already logged in, redirect to dashboard
    if (isLoggedIn && !normalizedPath.startsWith("auth/logout")) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|feed.xml).*)"],
};
