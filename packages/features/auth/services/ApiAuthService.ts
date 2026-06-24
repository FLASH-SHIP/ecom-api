import { createHash } from "node:crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import type { JwtPayload } from "@ecom/lib/jwt";
import { verifyToken } from "@ecom/lib/jwt";
import { createLogger } from "@ecom/lib/logger";
import { getRedisClient } from "@ecom/lib/redis";
import type { ApiKeyRepository } from "../repositories/ApiKeyRepository";
import type { UserRepository } from "../repositories/UserRepository";

const log = createLogger("ApiAuthService");

const TOKEN_BLACKLIST_PREFIX = "auth:blacklist:";

interface IApiAuthServiceDeps {
  apiKeyRepo: ApiKeyRepository;
  userRepo: UserRepository;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
  authMethod: "api_key" | "jwt" | "session";
}

export class ApiAuthService {
  private deps: IApiAuthServiceDeps;
  constructor(deps: IApiAuthServiceDeps) {
    this.deps = deps;
  }

  /**
   * Resolve authenticated user from a Bearer token.
   * Implements the dual-auth strategy:
   *   Token starts with "ecom_" → API Key
   *   Otherwise → JWT Access Token
   */
  async authenticateBearer(token: string): Promise<AuthenticatedUser> {
    if (token.startsWith("ecom_")) {
      return this.authenticateApiKey(token);
    }
    return this.authenticateJwt(token);
  }

  private async authenticateApiKey(rawKey: string): Promise<AuthenticatedUser> {
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.deps.apiKeyRepo.findByHashedKey(hashedKey);

    if (!apiKey) {
      throw ErrorWithCode.Factory.Unauthorized("Invalid API key");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw ErrorWithCode.Factory.Unauthorized("API key expired");
    }

    if (apiKey.user.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("User account is not active");
    }

    // Fire-and-forget lastUsed update
    this.deps.apiKeyRepo.updateLastUsed(apiKey.id).catch(() => {});

    return {
      id: apiKey.user.id,
      email: apiKey.user.email,
      name: apiKey.user.name,
      authMethod: "api_key",
    };
  }

  private async authenticateJwt(token: string): Promise<AuthenticatedUser> {
    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ErrorWithCode.Factory.Unauthorized("Invalid or expired token");
    }

    if (payload.type !== "access") {
      throw ErrorWithCode.Factory.Unauthorized("Expected access token, got refresh token");
    }

    // SEC-04: Check if token has been revoked via Redis blacklist
    const isRevoked = await ApiAuthService.isTokenRevoked(token);
    if (isRevoked) {
      throw ErrorWithCode.Factory.Unauthorized("Token has been revoked");
    }

    const user = await this.deps.userRepo.findById(payload.userId);
    if (!user) {
      throw ErrorWithCode.Factory.Unauthorized("User not found");
    }

    if (user.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("User account is not active");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      authMethod: "jwt",
    };
  }

  /**
   * Revoke a JWT token by adding its hash to the Redis blacklist.
   * TTL is set to the token's remaining lifetime so entries auto-expire (SEC-04).
   */
  static async revokeToken(token: string, ttlSeconds?: number): Promise<void> {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const redis = getRedisClient();
      const key = `${TOKEN_BLACKLIST_PREFIX}${tokenHash}`;
      // Default TTL: 15 minutes (max access token lifetime)
      const ttl = ttlSeconds ?? 15 * 60;
      await redis.set(key, "1", "EX", ttl);
    } catch (err) {
      log.warn("Failed to add token to blacklist", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Check if a token has been revoked (SEC-04).
   * Uses Redis SISMEMBER-equivalent GET for O(1) lookup.
   */
  static async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const redis = getRedisClient();
      const key = `${TOKEN_BLACKLIST_PREFIX}${tokenHash}`;
      const result = await redis.get(key);
      return result !== null;
    } catch (err) {
      // If Redis is down, fail open (allow) — token will still expire naturally
      log.warn("Failed to check token blacklist, allowing request", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Revoke all tokens for a user by user ID.
   * Useful for "logout from all devices" or admin account suspension.
   */
  static async revokeAllUserTokens(userId: number, ttlSeconds = 15 * 60): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `${TOKEN_BLACKLIST_PREFIX}user:${userId}`;
      await redis.set(key, "1", "EX", ttlSeconds);
    } catch (err) {
      log.warn("Failed to revoke all user tokens", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
