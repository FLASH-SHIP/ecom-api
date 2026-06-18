/**
 * Application-wide constants and configuration.
 */

export const APP_NAME = "Ecom";
export const APP_SLUG = "ecom";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

export const AUTH = {
  API_KEY_PREFIX: "ecom_",
  ACCESS_TOKEN_EXPIRES_IN: "15m",
  REFRESH_TOKEN_EXPIRES_IN: "30d",
  BCRYPT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
} as const;

export const RATE_LIMIT = {
  LOGIN: { maxAttempts: 6, windowMs: 60_000 },
  REFRESH: { maxAttempts: 20, windowMs: 60_000 },
  API: { maxAttempts: 100, windowMs: 60_000 },
} as const;

export const DEFAULT_ROLES = ["super-admin", "admin", "editor", "author"] as const;
export type DefaultRole = (typeof DEFAULT_ROLES)[number];
