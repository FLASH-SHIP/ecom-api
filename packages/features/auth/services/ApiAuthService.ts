import { createHash } from "node:crypto";
import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import type { JwtPayload } from "@ecom/lib/jwt";
import { verifyToken } from "@ecom/lib/jwt";
import { createLogger } from "@ecom/lib/logger";
import { getRedisClient, RedisCache } from "@ecom/lib/redis";
import type { ApiKeyRepository } from "../repositories/ApiKeyRepository";
import type { UserRepository } from "../repositories/UserRepository";

import { resolveUserPermissions as resolvePermissionsFromUser } from "../utils/permissionUtils";

const log = createLogger("ApiAuthService");

const TOKEN_BLACKLIST_PREFIX = "auth:blacklist:";

interface IApiAuthServiceDeps {
  apiKeyRepo: ApiKeyRepository;
  userRepo: UserRepository;
  customerRepo: CustomerRepository;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  authMethod: "api_key" | "jwt" | "session";
  permissions: string[];
  ownerType: "User" | "Customer";
}

const permissionsCache = new RedisCache<string[]>("user-permissions", 3600);

async function resolveUserPermissions(userId: string, userRepo: UserRepository): Promise<string[]> {
  const cacheKey = `user:${userId}`;
  const cachedPermissions = await permissionsCache.get(cacheKey);

  if (cachedPermissions) {
    return cachedPermissions;
  }

  const user = await userRepo.findByIdWithRoles(userId);
  if (!user) {
    return [];
  }

  const uniquePermissions = resolvePermissionsFromUser(user);
  await permissionsCache.set(cacheKey, uniquePermissions);
  return uniquePermissions;
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }
  return trimmed;
}

function ipToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const partStr = parts[i];
    if (partStr === undefined) return null;
    const part = parseInt(partStr, 10);
    if (Number.isNaN(part) || part < 0 || part > 255) return null;
    num = (num << 8) + part;
  }
  return num >>> 0;
}

function matchCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split("/");
  const range = parts[0];
  const bitsStr = parts[1];
  if (range === undefined) {
    return false;
  }
  if (bitsStr === undefined) {
    return ip === range;
  }
  const bits = parseInt(bitsStr, 10);
  if (Number.isNaN(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const ipNum = ipToLong(ip);
  const rangeNum = ipToLong(range);
  if (ipNum === null || rangeNum === null) {
    return false;
  }
  const mask = bits === 0 ? 0 : ~0 << (32 - bits);
  return (ipNum & mask) === (rangeNum & mask);
}

function isIpAllowed(
  clientIp: string | undefined,
  allowedIps: string[] | null | undefined,
): boolean {
  if (!allowedIps || allowedIps.length === 0) {
    return true;
  }
  if (!clientIp) {
    return false;
  }
  const normalizedClient = normalizeIp(clientIp);
  return allowedIps.some((allowed) => matchCidr(normalizedClient, normalizeIp(allowed)));
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
  async authenticateBearer(token: string, clientIp?: string): Promise<AuthenticatedUser> {
    if (token.startsWith("ecom_")) {
      return this.authenticateApiKey(token, clientIp);
    }
    return this.authenticateJwt(token);
  }

  private async authenticateApiKey(rawKey: string, clientIp?: string): Promise<AuthenticatedUser> {
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.deps.apiKeyRepo.findByHashedKey(hashedKey);

    if (!apiKey) {
      throw ErrorWithCode.Factory.Unauthorized("Invalid API key");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw ErrorWithCode.Factory.Unauthorized("API key expired");
    }

    if (!isIpAllowed(clientIp, apiKey.allowedIps)) {
      throw ErrorWithCode.Factory.Forbidden("IP address not allowed");
    }

    // Fire-and-forget lastUsed update
    this.deps.apiKeyRepo.updateLastUsed(apiKey.id).catch(() => {});

    if (apiKey.ownerType === "User") {
      const user = await this.deps.userRepo.findById(apiKey.ownerId);
      if (!user) {
        throw ErrorWithCode.Factory.Unauthorized("User not found");
      }
      if (user.status !== "ACTIVE") {
        throw ErrorWithCode.Factory.Forbidden("User account is not active");
      }
      const userPermissions = await resolveUserPermissions(user.id, this.deps.userRepo);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        authMethod: "api_key",
        permissions: userPermissions,
        ownerType: "User",
      };
    } else if (apiKey.ownerType === "Customer") {
      const customer = await this.deps.customerRepo.findById(apiKey.ownerId);
      if (!customer) {
        throw ErrorWithCode.Factory.Unauthorized("Customer not found");
      }
      if (customer.status !== "ACTIVE") {
        throw ErrorWithCode.Factory.Forbidden("Customer account is not active");
      }
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        authMethod: "api_key",
        permissions: ["customer"],
        ownerType: "Customer",
      };
    }

    throw ErrorWithCode.Factory.Unauthorized("Invalid API key owner type");
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

    const payloadUserId = payload.sub || payload.userId;
    const isCustomerToken = payload.role === "customer" || !payload.userId;

    if (isCustomerToken && payloadUserId) {
      const customer = await this.deps.customerRepo.findById(payloadUserId);
      if (!customer) {
        throw ErrorWithCode.Factory.Unauthorized("Customer not found");
      }
      if (customer.status !== "ACTIVE") {
        throw ErrorWithCode.Factory.Forbidden("Customer account is not active");
      }
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        authMethod: "jwt",
        permissions: ["customer"],
        ownerType: "Customer",
      };
    }

    if (!payload.userId) {
      throw ErrorWithCode.Factory.Unauthorized("User not found");
    }

    const user = await this.deps.userRepo.findById(payload.userId);
    if (!user) {
      throw ErrorWithCode.Factory.Unauthorized("User not found");
    }

    if (user.status !== "ACTIVE") {
      throw ErrorWithCode.Factory.Forbidden("User account is not active");
    }

    const userPermissions = await resolveUserPermissions(user.id, this.deps.userRepo);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      authMethod: "jwt",
      permissions: userPermissions,
      ownerType: "User",
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
  static async revokeAllUserTokens(userId: string, ttlSeconds = 15 * 60): Promise<void> {
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
