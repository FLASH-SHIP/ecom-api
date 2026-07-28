import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

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
 * Uses timing-safe comparison to prevent timing side-channel attacks (SEC-02).
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const computedHash = sha256(rawKey);
  try {
    return timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
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
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// ── Symmetric Encryption (AES-256-GCM) for API Credentials ───────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY environment variable is not defined in production!");
    }
    // Fallback 32-byte key for local development
    return Buffer.from("7f7c7562e84d4365b210cd47f9e8a1d354b38d38867a4219a5840d04c40b8a3e", "hex");
  }
  // Hash the env string to guarantee a 32-byte key
  return createHash("sha256").update(envKey).digest();
}

/**
 * Encrypt a string symmetrically using AES-256-GCM.
 * Returns a colon-separated string: iv:ciphertext:tag
 */
export function encryptSymmetrically(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${encrypted}:${tag}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 */
export function decryptSymmetrically(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format (expected iv:ciphertext:tag)");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const ciphertext = parts[1]!;
  const tag = Buffer.from(parts[2]!, "hex");

  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Webhook HMAC SHA-256 Signature ───────────────────────────────────────────

/**
 * Generate HMAC SHA-256 signature for outgoing webhook payload.
 */
export function generateHmacSignature(payload: string | object, secret: string): string {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  return createHmac("sha256", secret).update(data, "utf-8").digest("hex");
}

/**
 * Verify HMAC SHA-256 signature from incoming webhook request.
 */
export function verifyHmacSignature(
  payload: string | object,
  secret: string,
  expectedSignature: string,
): boolean {
  try {
    const actualSignature = generateHmacSignature(payload, secret);
    const expectedBuf = Buffer.from(expectedSignature.replace(/^sha256=/, ""), "hex");
    const actualBuf = Buffer.from(actualSignature, "hex");

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
