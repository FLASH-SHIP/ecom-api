import crypto from "node:crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import { getRedisClient } from "@ecom/lib/redis";
import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"];
const REFRESH_TOKEN_TTL = (process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ?? "30d") as SignOptions["expiresIn"];

export interface CustomerTokenPayload {
  sub: string;
  email: string;
  type: "access" | "refresh";
  jti?: string;
  iat?: number;
}

export class CustomerTokenService {
  private accessSecret: string;
  private refreshSecret: string;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    this.accessSecret = secret;
    // Use separate refresh secret if available, fall back to JWT_SECRET
    this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? secret;
  }

  generateTokens(customer: { id: string; email: string }) {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        type: "access",
        jti: accessJti,
      } satisfies CustomerTokenPayload,
      this.accessSecret,
      { expiresIn: ACCESS_TOKEN_TTL, issuer: "ecom", audience: "ecom-customer" },
    );

    const refreshToken = jwt.sign(
      {
        sub: customer.id,
        email: customer.email,
        type: "refresh",
        jti: refreshJti,
      } satisfies CustomerTokenPayload,
      this.refreshSecret,
      { expiresIn: REFRESH_TOKEN_TTL, issuer: "ecom", audience: "ecom-customer" },
    );

    return { accessToken, refreshToken };
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
    const redis = getRedisClient();
    const result = await redis.get(`customer:token_blacklist:${jti}`);
    return result === "1";
  }

  async revokeAllTokens(customerId: string): Promise<void> {
    const redis = getRedisClient();
    const now = Math.floor(Date.now() / 1000);
    await redis.set(`customer:revoked_before:${customerId}`, String(now));
  }

  async getRevocationTime(customerId: string): Promise<number | null> {
    const redis = getRedisClient();
    const val = await redis.get(`customer:revoked_before:${customerId}`);
    return val ? Number(val) : null;
  }
}
