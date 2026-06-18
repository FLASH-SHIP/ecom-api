/**
 * Centralized auth token management for the customer app.
 * Uses "memberAccessToken" / "memberRefreshToken" as canonical key names.
 */

export const AUTH_KEYS = {
  accessToken: "memberAccessToken",
  refreshToken: "memberRefreshToken",
} as const;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.refreshToken);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(AUTH_KEYS.accessToken, accessToken);
  localStorage.setItem(AUTH_KEYS.refreshToken, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(AUTH_KEYS.accessToken);
  localStorage.removeItem(AUTH_KEYS.refreshToken);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
