import { getRedisClient } from '@flash-ship/ecom-lib/redis';
import type { EpicHubEnvelope, EpicHubTokenResult } from './dtos/epichub.dto';
import { resolvePartnerConfig } from '../../shared/partner-config-crypto';

export interface EpicHubAuthConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
  tokenTtlSeconds?: number;
  dbApiConfig?: Record<string, any> | null;
}

export class EpicHubAuthService {
  private config: {
    baseUrl: string;
    username: string;
    password: string;
    tokenTtlSeconds: number;
  };
  private inMemoryToken: string | null = null;
  private inMemoryExpiresAt = 0;

  constructor(configInput?: EpicHubAuthConfig) {
    // Hybrid Credential Resolution Chain:
    // 1. Explicit / DB Config from Partner.apiConfig (with AES-256 decryption)
    // 2. Fallback to process.env (EPICHUB_BASE_URL, EPICHUB_USERNAME, EPICHUB_PASSWORD)
    const envFallback = {
      baseUrl: process.env.EPICHUB_BASE_URL || 'https://clutchshipper.com/api',
      username: process.env.EPICHUB_USERNAME || '',
      password: process.env.EPICHUB_PASSWORD || '',
      tokenTtlSeconds: Number(process.env.EPICHUB_TOKEN_TTL_SECONDS) || 41400,
    };

    const inputExplicit = {
      baseUrl: configInput?.baseUrl,
      username: configInput?.username,
      password: configInput?.password,
      tokenTtlSeconds: configInput?.tokenTtlSeconds,
    };

    const resolvedDbConfig = resolvePartnerConfig<Record<string, any>>(configInput?.dbApiConfig, inputExplicit);

    this.config = {
      baseUrl: resolvedDbConfig.baseUrl || envFallback.baseUrl,
      username: resolvedDbConfig.username || envFallback.username,
      password: resolvedDbConfig.password || envFallback.password,
      tokenTtlSeconds: resolvedDbConfig.tokenTtlSeconds || envFallback.tokenTtlSeconds,
    };
  }

  public getResolvedConfig() {
    return { ...this.config };
  }

  private getCacheKey(): string {
    return `epichub:session_token:${this.config.username || 'default'}`;
  }

  private getLockKey(): string {
    return `epichub:lock:session_token:${this.config.username || 'default'}`;
  }

  /**
   * Retrieves a valid Session Token from Cache (Redis/Memory) or fetches a new one via HTTP Basic Auth.
   * Uses Redis Mutex Lock to prevent Token Thundering Herd under high concurrency.
   */
  public async getSessionToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      // 1. Try In-Memory Cache first
      if (this.inMemoryToken && Date.now() < this.inMemoryExpiresAt) {
        return this.inMemoryToken;
      }

      // 2. Try Redis Cache
      try {
        const redis = getRedisClient();
        const cachedToken = await redis.get(this.getCacheKey());
        if (cachedToken) {
          this.inMemoryToken = cachedToken;
          this.inMemoryExpiresAt = Date.now() + 60 * 1000; // cache in memory for 1 minute
          return cachedToken;
        }
      } catch (err) {
        console.warn('[EpicHubAuthService] Redis read failed, falling back to fetch:', (err as Error).message);
      }
    }

    // 3. Acquire Lock & Fetch new token
    return this.acquireLockAndFetchToken();
  }

  private async acquireLockAndFetchToken(): Promise<string> {
    const lockKey = this.getLockKey();
    const lockTtlMs = 10000;
    const lockVal = `${Date.now()}_${Math.random()}`;

    let acquired = false;
    try {
      const redis = getRedisClient();
      // Try setting Redis lock with NX (Only if Not Exists)
      const res = await redis.set(lockKey, lockVal, 'PX', lockTtlMs, 'NX');
      acquired = res === 'OK';
    } catch {
      acquired = true; // Fallback if Redis fails
    }

    if (!acquired) {
      // Wait 300ms for another process to complete token refresh
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Re-read token from Redis
      try {
        const redis = getRedisClient();
        const token = await redis.get(this.getCacheKey());
        if (token) {
          this.inMemoryToken = token;
          this.inMemoryExpiresAt = Date.now() + 60 * 1000;
          return token;
        }
      } catch {
        // Continue to fetch if retry fails
      }
    }

    try {
      const token = await this.fetchTokenFromApi();
      const ttlSeconds = this.config.tokenTtlSeconds || 41400; // 11.5 hours

      // Store token in Redis Cache
      try {
        const redis = getRedisClient();
        await redis.set(this.getCacheKey(), token, 'EX', ttlSeconds);
      } catch (err) {
        console.warn('[EpicHubAuthService] Redis set token failed:', (err as Error).message);
      }

      this.inMemoryToken = token;
      this.inMemoryExpiresAt = Date.now() + ttlSeconds * 1000;
      return token;
    } finally {
      // Release lock
      if (acquired) {
        try {
          const redis = getRedisClient();
          const currentLock = await redis.get(lockKey);
          if (currentLock === lockVal) {
            await redis.del(lockKey);
          }
        } catch {
          // Ignore lock deletion errors
        }
      }
    }
  }

  private async fetchTokenFromApi(): Promise<string> {
    const authHeader = `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`;
    const targetUrl = `${this.config.baseUrl.replace(/\/+$/, '')}/auth/token`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[EpicHubAuthService] Failed to authenticate with EpicHub (${res.status}): ${errText}`);
    }

    const json = (await res.json()) as EpicHubEnvelope<EpicHubTokenResult>;
    if (json.ResponseStatus?.Code !== 200 || !json.ResponseResults?.Token) {
      throw new Error(`[EpicHubAuthService] Invalid token response: ${json.ResponseStatus?.Message || 'No token returned'}`);
    }

    return json.ResponseResults.Token;
  }

  public async invalidateToken(): Promise<void> {
    this.inMemoryToken = null;
    this.inMemoryExpiresAt = 0;
    try {
      const redis = getRedisClient();
      await redis.del(this.getCacheKey());
    } catch {
      // Ignore redis deletion errors
    }
  }
}
