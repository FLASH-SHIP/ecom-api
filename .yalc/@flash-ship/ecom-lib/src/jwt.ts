import { randomUUID } from "node:crypto";
import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

const JWT_ISSUER = "ecom";
const JWT_AUDIENCE = "ecom-api";

/**
 * Get JWT secret with production safety guard.
 * Throws in production if JWT_SECRET is not set (SEC-01).
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: JWT_SECRET environment variable is required in production");
    }
    return "dev-jwt-secret";
  }
  return secret;
}

/**
 * Get separate secret for refresh tokens (SEC-03).
 * Falls back to JWT_SECRET + suffix if JWT_REFRESH_SECRET is not set.
 */
function getJwtRefreshSecret(): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (refreshSecret) return refreshSecret;

  const baseSecret = getJwtSecret();
  if (process.env.NODE_ENV === "production" && !refreshSecret) {
    return `${baseSecret}:refresh`;
  }
  return `${baseSecret}:refresh`;
}

function getJwtAdminSecret(): string {
  const secret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: JWT_ADMIN_SECRET environment variable is required in production");
    }
    return "dev-jwt-secret";
  }
  return secret;
}

/** Parse a duration string (e.g. "15m", "30d") into seconds. */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const value = Number.parseInt(match[1] ?? "0", 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const multiplier = multipliers[unit ?? ""];
  if (!multiplier) throw new Error(`Invalid duration unit: ${unit}`);
  return value * multiplier;
}

function getAccessTokenTtl(): number {
  return parseDurationToSeconds(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m");
}

function getRefreshTokenTtl(): number {
  return parseDurationToSeconds(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "30d");
}

export interface JwtPayload {
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  tokenVersion?: number;
  userAgentHash?: string;
  type: "access" | "refresh";
  exp?: number;
  iat?: number;
}

/**
 * Sign a JWT access token (short-lived: 15 minutes default).
 * Includes iss/aud claims for multi-service differentiation (SEC-09).
 */
export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  const options: SignOptions = {
    expiresIn: getAccessTokenTtl(),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  return jwt.sign({ ...payload, type: "access" }, getJwtSecret(), options);
}

/**
 * Sign a JWT access token for Customer users (audience: "ecom-customer").
 */
export function signCustomerAccessToken(payload: { sub: string; email?: string; tokenVersion?: number }): string {
  const options: SignOptions = {
    expiresIn: getAccessTokenTtl(),
    issuer: JWT_ISSUER,
    audience: "ecom-customer",
  };
  return jwt.sign({ ...payload, type: "access" }, getJwtSecret(), options);
}

/**
 * Sign a JWT refresh token (long-lived: 30 days default).
 * Uses separate secret from access token (SEC-03).
 * Includes iss/aud claims for multi-service differentiation (SEC-09).
 */
export function signRefreshToken(payload: Omit<JwtPayload, "type">): string {
  const options: SignOptions = {
    expiresIn: getRefreshTokenTtl(),
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  return jwt.sign({ ...payload, type: "refresh" }, getJwtRefreshSecret(), options);
}

/**
 * Verify and decode a JWT access token.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;
}

/**
 * Verify and decode a JWT refresh token using the separate refresh secret.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtRefreshSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;
}

/**
 * Decode a JWT token without verification (useful for expired token inspection).
 */
export function decodeToken(token: string): JwtPayload | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") return null;
  return decoded as JwtPayload;
}

/**
 * Calculate expiration date from a duration string (e.g., "15m", "30d").
 * Reuses parseDurationToSeconds to avoid duplicate logic (PERF-09).
 */
export function getExpirationDate(duration: string): Date {
  const seconds = parseDurationToSeconds(duration);
  return new Date(Date.now() + seconds * 1000);
}

export interface QueueDashboardJwtPayload {
  userId: string;
  email: string;
  type: "queue-dashboard-sso" | "queue-dashboard-session";
  jti?: string;
}

/**
 * Sign a short-lived SSO token for the Queue dashboard (expires in 60s).
 */
export function signQueueDashboardToken(
  payload: Omit<QueueDashboardJwtPayload, "type" | "jti">,
): string {
  const options: SignOptions = { expiresIn: 60, jwtid: randomUUID() }; // 60 seconds
  return jwt.sign({ ...payload, type: "queue-dashboard-sso" }, getJwtAdminSecret(), options);
}

/**
 * Sign a longer-lived session token for the Queue dashboard (expires in 2h).
 */
export function signQueueDashboardSession(payload: Omit<QueueDashboardJwtPayload, "type">): string {
  const options: SignOptions = { expiresIn: "2h" };
  return jwt.sign({ ...payload, type: "queue-dashboard-session" }, getJwtAdminSecret(), options);
}

/**
 * Verify queue dashboard JWT.
 */
export function verifyQueueDashboardToken(token: string): QueueDashboardJwtPayload {
  return jwt.verify(token, getJwtAdminSecret()) as QueueDashboardJwtPayload;
}
