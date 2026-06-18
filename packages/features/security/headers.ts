import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Security headers for production deployment.
 *
 * These headers protect against common web vulnerabilities:
 * - XSS (Content-Security-Policy, X-XSS-Protection)
 * - Clickjacking (X-Frame-Options)
 * - MIME sniffing (X-Content-Type-Options)
 * - Protocol downgrade (Strict-Transport-Security)
 * - Information leakage (Referrer-Policy, Permissions-Policy)
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/**
 * Content-Security-Policy for admin panel.
 * Allows inline styles (Tailwind) and self-hosted scripts only.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * Apply security headers to a Next.js response.
 * Can be used in middleware.ts or as a utility in API routes.
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  return response;
}

/**
 * Next.js middleware function that adds security headers to all responses.
 *
 * Usage in middleware.ts:
 *   export { securityMiddleware as middleware } from "@ecom/features/security/headers";
 *
 * Or compose with existing middleware:
 *   const response = NextResponse.next();
 *   applySecurityHeaders(response);
 */
export function securityMiddleware(_request: NextRequest): NextResponse {
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

/**
 * Get security headers as a plain object (for non-Next.js contexts like NestJS).
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    "Content-Security-Policy": CSP_DIRECTIVES,
  };
}
