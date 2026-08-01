import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_PREFIX = 'enc:v1:';

/**
 * Gets master encryption key derived from process.env.PARTNER_CONFIG_SECRET or process.env.APP_SECRET or default fallback
 */
function getMasterKey(): Buffer {
  const secret = process.env.PARTNER_CONFIG_SECRET || process.env.APP_SECRET || 'ecom-express-default-secret-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext secret string using AES-256-GCM
 */
export function encryptSecret(text: string): string {
  if (!text || text.startsWith(ENCRYPTION_PREFIX)) {
    return text;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getMasterKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted into single base64 string
  const combined = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  return `${ENCRYPTION_PREFIX}${combined}`;
}

/**
 * Decrypt an AES-256-GCM ciphertext back to plaintext
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return ciphertext; // Return as-is if plain text
  }

  try {
    const rawBase64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
    const combined = Buffer.from(rawBase64, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedText = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.warn('[PartnerConfigCrypto] Failed to decrypt ciphertext, returning original string:', (err as Error).message);
    return ciphertext;
  }
}

/**
 * Hybrid Resolution Chain:
 * 1. Checks UI/DB Partner apiConfig first (decrypting any encrypted fields like password, apiKey).
 * 2. Falls back to static environment variables (.env) if missing.
 */
export function resolvePartnerConfig<T extends Record<string, any>>(
  dbApiConfig?: Record<string, any> | null,
  envFallback?: Record<string, any>,
): T {
  const resolved: Record<string, any> = {};

  // 1. Fill defaults from Env Fallback
  if (envFallback) {
    Object.assign(resolved, envFallback);
  }

  // 2. Override with Dynamic DB Config (if present)
  if (dbApiConfig && typeof dbApiConfig === 'object') {
    for (const [key, value] of Object.entries(dbApiConfig)) {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string') {
          resolved[key] = decryptSecret(value);
        } else {
          resolved[key] = value;
        }
      }
    }
  }

  return resolved as T;
}
