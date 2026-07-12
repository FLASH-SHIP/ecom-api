import crypto from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates an unbiased, cryptographically secure random string using a custom 32-character alphabet.
 * Since 32 divides 256 evenly, using modulo arithmetic on random bytes is mathematically 100% unbiased.
 */
export function generateRandomString(length: number): string {
  const bytes = crypto.randomBytes(length);
  const alphabetLength = ALPHABET.length;
  let result = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    result += ALPHABET.charAt(byte % alphabetLength);
  }
  return result;
}

/**
 * Generates a unique business entity code.
 * Format: [PREFIX][YYMMDD][8-CHAR-BASE32]
 * Example: EC260708BQHEWXU0
 *
 * @param prefix Configurable prefix for the entity (e.g. "EC", "INV", "TXN")
 * @returns The formatted entity code
 */
export function generateEntityCode(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;

  const suffix = generateRandomString(8);
  return `${prefix}${dateStr}${suffix}`;
}
