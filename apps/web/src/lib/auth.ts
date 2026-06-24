/**
 * Centralized auth token management for the customer app.
 * Uses "customerAccessToken" / "customerRefreshToken" as canonical key names.
 */

export const AUTH_KEYS = {
  sessionToken: "authjs.session-token",
  secureSessionToken: "__Secure-authjs.session-token",
} as const;

export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}

export function isLoggedIn(): boolean {
  return !!getCookie(AUTH_KEYS.sessionToken) || !!getCookie(AUTH_KEYS.secureSessionToken);
}

// These are no-op placeholders on the web marketing app since actual token modification
// must be handled by the next-auth server callbacks.
export function getAccessToken(): string | null {
  return getCookie(AUTH_KEYS.sessionToken);
}

export function getRefreshToken(): string | null {
  return getCookie(AUTH_KEYS.secureSessionToken);
}

export function setTokens(_accessToken: string, _refreshToken: string): void {}
export function clearTokens(): void {}
