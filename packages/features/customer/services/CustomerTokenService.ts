import crypto from "node:crypto";
import { AUTH } from "@flash-ship/ecom-config";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { getRedisClient } from "@flash-ship/ecom-lib/redis";
import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

export interface CustomerTokenPayload {
  sub: string;
  email: string;
  type: "access" | "refresh";
  jti?: string;
  iat?: number;
  familyId?: string;
  deviceId?: string;
}

export interface MobileDeviceMeta {
  deviceId?: string;
  deviceName?: string;
  os?: string;
  osVersion?: string;
}

export interface TokenFamilyState {
  activeJti: string;
  previousJti?: string;
  graceUntil?: number;
  cachedTokens?: {
    accessToken: string;
    refreshToken: string;
  };
  customerId: string;
  deviceMeta?: MobileDeviceMeta;
}

export interface CustomerTokenServiceOptions {
  accessSecret?: string;
  refreshSecret?: string;
  accessTokenTtl?: SignOptions["expiresIn"];
  refreshTokenTtl?: SignOptions["expiresIn"];
}

export class CustomerTokenService {
  private accessSecret: string;
  private refreshSecret: string;
  private accessTokenTtl: SignOptions["expiresIn"];
  private refreshTokenTtl: SignOptions["expiresIn"];

  constructor(opts?: CustomerTokenServiceOptions) {
    const secret =
      opts?.accessSecret ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      "dev-jwt-secret-do-not-use-in-production";
    this.accessSecret = secret;
    this.refreshSecret = opts?.refreshSecret || process.env.JWT_REFRESH_SECRET || secret;
    this.accessTokenTtl =
      opts?.accessTokenTtl ||
      (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]) ||
      (AUTH.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]);
    this.refreshTokenTtl =
      opts?.refreshTokenTtl ||
      (process.env.JWT_REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]) ||
      (AUTH.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]);
  }

  generateAccessToken(
    customer: { id: string; email: string },
    opts?: { familyId?: string; deviceId?: string },
  ): string {
    const accessJti = crypto.randomUUID();
    return jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        type: "access",
        jti: accessJti,
        ...(opts?.familyId && { familyId: opts.familyId }),
        ...(opts?.deviceId && { deviceId: opts.deviceId }),
      } satisfies CustomerTokenPayload,
      this.accessSecret,
      { expiresIn: this.accessTokenTtl, issuer: "ecom", audience: "ecom-customer" },
    );
  }

  generateTokens(customer: { id: string; email: string }) {
    const accessToken = this.generateAccessToken(customer);
    const refreshJti = crypto.randomUUID();

    const refreshToken = jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        type: "refresh",
        jti: refreshJti,
      } satisfies CustomerTokenPayload,
      this.refreshSecret,
      { expiresIn: this.refreshTokenTtl, issuer: "ecom", audience: "ecom-customer" },
    );

    return { accessToken, refreshToken };
  }

  async generateMobileTokens(
    customer: { id: string; email: string },
    familyId?: string,
    deviceMeta?: MobileDeviceMeta,
  ) {
    const activeFamilyId = familyId || crypto.randomUUID();
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        type: "access",
        jti: accessJti,
        familyId: activeFamilyId,
        ...(deviceMeta?.deviceId && { deviceId: deviceMeta.deviceId }),
      } satisfies CustomerTokenPayload,
      this.accessSecret,
      { expiresIn: this.accessTokenTtl, issuer: "ecom", audience: "ecom-customer" },
    );

    const refreshToken = jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        type: "refresh",
        jti: refreshJti,
        familyId: activeFamilyId,
        ...(deviceMeta?.deviceId && { deviceId: deviceMeta.deviceId }),
      } satisfies CustomerTokenPayload,
      this.refreshSecret,
      { expiresIn: this.refreshTokenTtl, issuer: "ecom", audience: "ecom-customer" },
    );

    const familyState: TokenFamilyState = {
      activeJti: refreshJti,
      customerId: customer.id,
      ...(deviceMeta && { deviceMeta }),
    };

    try {
      const redis = getRedisClient();
      await redis.set(
        `customer:token_family:${activeFamilyId}`,
        JSON.stringify(familyState),
        "EX",
        2592000, // 30 days TTL
      );
    } catch (e) {
      console.warn("[CustomerTokenService] Redis set family error:", (e as Error).message);
    }

    return { accessToken, refreshToken, familyId: activeFamilyId };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<CustomerTokenPayload & { iat: number; exp: number }> {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        issuer: "ecom",
        audience: "ecom-customer",
      }) as unknown as CustomerTokenPayload & {
        iat: number;
        exp: number;
      };
      if (payload.type !== "access") {
        throw ErrorWithCode.Factory.Unauthorized("Invalid token type");
      }

      if (payload.jti) {
        const isBlacklisted = await this.isTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw ErrorWithCode.Factory.Unauthorized("Token is blacklisted");
        }
      }

      const revokedBefore = await this.getRevocationTime(payload.sub);
      if (revokedBefore !== null && payload.iat < revokedBefore) {
        throw ErrorWithCode.Factory.Unauthorized("Token has been revoked");
      }

      return payload;
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.Unauthorized("Invalid or expired access token");
    }
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<CustomerTokenPayload & { iat: number; exp: number }> {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        issuer: "ecom",
        audience: "ecom-customer",
      }) as unknown as CustomerTokenPayload & {
        iat: number;
        exp: number;
      };
      if (payload.type !== "refresh") {
        throw ErrorWithCode.Factory.Unauthorized("Invalid token type");
      }

      if (payload.jti) {
        const isBlacklisted = await this.isTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
          throw ErrorWithCode.Factory.Unauthorized("Token is blacklisted");
        }
      }

      const revokedBefore = await this.getRevocationTime(payload.sub);
      if (revokedBefore !== null && payload.iat < revokedBefore) {
        throw ErrorWithCode.Factory.Unauthorized("Token has been revoked");
      }

      return payload;
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.Unauthorized("Invalid or expired refresh token");
    }
  }

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    const redis = getRedisClient();
    await redis.set(`customer:token_blacklist:${jti}`, "1", "EX", ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const result = await redis.get(`customer:token_blacklist:${jti}`);
      return result === "1";
    } catch (e) {
      console.warn("[CustomerTokenService] Redis blacklist check error:", (e as Error).message);
      return false;
    }
  }

  async revokeAllTokens(customerId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const now = Math.floor(Date.now() / 1000);
      await redis.set(`customer:revoked_before:${customerId}`, String(now));
    } catch (e) {
      console.warn("[CustomerTokenService] Redis revokeAllTokens error:", (e as Error).message);
    }
  }

  async getRevocationTime(customerId: string): Promise<number | null> {
    try {
      const redis = getRedisClient();
      const val = await redis.get(`customer:revoked_before:${customerId}`);
      return val ? Number(val) : null;
    } catch (e) {
      console.warn("[CustomerTokenService] Redis revocation check error:", (e as Error).message);
      return null;
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(`customer:token_family:${familyId}`);
    } catch (e) {
      console.warn("[CustomerTokenService] Redis revokeFamily error:", (e as Error).message);
    }
  }

  async rotateMobileRefreshToken(token: string) {
    const payload = await this.verifyRefreshToken(token);

    if (!payload.familyId) {
      throw ErrorWithCode.Factory.BadRequest("Missing familyId in mobile refresh token");
    }

    const redis = getRedisClient();
    const familyKey = `customer:token_family:${payload.familyId}`;

    let familyStateStr: string | null = null;
    try {
      familyStateStr = await redis.get(familyKey);
    } catch (e) {
      console.warn("[CustomerTokenService] Redis get family error:", (e as Error).message);
    }

    if (!familyStateStr) {
      throw ErrorWithCode.Factory.Unauthorized("Mobile token family expired or revoked");
    }

    const familyState = JSON.parse(familyStateStr) as TokenFamilyState;

    // Grace period check for 3G/4G network retries (15 seconds window)
    if (
      familyState.previousJti === payload.jti &&
      familyState.graceUntil &&
      Date.now() < familyState.graceUntil &&
      familyState.cachedTokens
    ) {
      return {
        accessToken: familyState.cachedTokens.accessToken,
        refreshToken: familyState.cachedTokens.refreshToken,
        familyId: payload.familyId,
      };
    }

    // AUTOMATED REUSE DETECTION KILL-SWITCH (RFC 6819)
    if (familyState.activeJti !== payload.jti) {
      // Token reuse detected! Revoke the entire family immediately to protect the user
      await this.revokeFamily(payload.familyId);
      throw ErrorWithCode.Factory.Unauthorized(
        "Security Alert: Refresh token reuse detected. Device session terminated.",
      );
    }

    // Normal rotation: Generate new token pair and update family state
    const newMobileTokens = await this.generateMobileTokens(
      { id: payload.sub, email: payload.email },
      payload.familyId,
      familyState.deviceMeta,
    );

    const decodedRefresh = jwt.decode(newMobileTokens.refreshToken) as CustomerTokenPayload | null;
    const updatedState: TokenFamilyState = {
      activeJti: decodedRefresh?.jti ?? "",
      previousJti: payload.jti,
      graceUntil: Date.now() + 15000, // 15s Grace Period window
      cachedTokens: {
        accessToken: newMobileTokens.accessToken,
        refreshToken: newMobileTokens.refreshToken,
      },
      customerId: payload.sub,
      deviceMeta: familyState.deviceMeta,
    };

    try {
      await redis.set(familyKey, JSON.stringify(updatedState), "EX", 2592000);
    } catch (e) {
      console.warn("[CustomerTokenService] Redis update family error:", (e as Error).message);
    }

    return newMobileTokens;
  }
}
