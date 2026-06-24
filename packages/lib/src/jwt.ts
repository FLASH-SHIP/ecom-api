import { randomUUID } from "node:crypto";
import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";

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

const ACCESS_TOKEN_TTL = parseDurationToSeconds(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m");
const REFRESH_TOKEN_TTL = parseDurationToSeconds(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "30d");

export interface JwtPayload {
  userId: number;
  email: string;
  type: "access" | "refresh";
}

/**
 * Sign a JWT access token (short-lived: 15 minutes default).
 */
export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_TTL };
  return jwt.sign({ ...payload, type: "access" }, JWT_SECRET, options);
}

/**
 * Sign a JWT refresh token (long-lived: 30 days default).
 */
export function signRefreshToken(payload: Omit<JwtPayload, "type">): string {
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_TTL };
  return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
 */
export function getExpirationDate(duration: string): Date {
  const now = Date.now();
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1] ?? "0", 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const multiplier = multipliers[unit ?? ""];
  if (!multiplier) {
    throw new Error(`Invalid duration unit: ${unit}`);
  }

  return new Date(now + value * multiplier);
}

export interface QueueDashboardJwtPayload {
  userId: number;
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
  return jwt.sign({ ...payload, type: "queue-dashboard-sso" }, JWT_SECRET, options);
}

/**
 * Sign a longer-lived session token for the Queue dashboard (expires in 2h).
 */
export function signQueueDashboardSession(payload: Omit<QueueDashboardJwtPayload, "type">): string {
  const options: SignOptions = { expiresIn: "2h" };
  return jwt.sign({ ...payload, type: "queue-dashboard-session" }, JWT_SECRET, options);
}

/**
 * Verify queue dashboard JWT.
 */
export function verifyQueueDashboardToken(token: string): QueueDashboardJwtPayload {
  return jwt.verify(token, JWT_SECRET) as QueueDashboardJwtPayload;
}
