import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "ecom_";
const API_KEY_LENGTH = 32;

/**
 * Generate a SHA256 hash of the input string.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Generate a new API key with the `ecom_` prefix.
 * Returns both the raw key (shown once to user) and the hash (stored in DB).
 */
export function generateApiKey(): { rawKey: string; hashedKey: string } {
  const randomPart = randomBytes(API_KEY_LENGTH).toString("hex").slice(0, API_KEY_LENGTH);
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;
  const hashedKey = sha256(rawKey);
  return { rawKey, hashedKey };
}

/**
 * Verify an API key by comparing its hash against the stored hash.
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  return sha256(rawKey) === storedHash;
}

/**
 * Check if a token is an API key (starts with `ecom_` prefix).
 */
export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

/**
 * Generate a cryptographically secure random string.
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Hash a password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}
