import { ErrorWithCode } from "@ecom/lib/errors";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export interface MemberTokenPayload {
  sub: number;
  email: string;
  type: "access" | "refresh";
}

/**
 * Generates and verifies JWT tokens for member authentication.
 * Used by the mobile/extension API endpoints.
 */
export class MemberTokenService {
  /**
   * Generate access + refresh token pair for a member.
   */
  generateTokens(member: { id: number; email: string }) {
    const accessToken = jwt.sign(
      { sub: member.id, email: member.email, type: "access" } satisfies MemberTokenPayload,
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = jwt.sign(
      { sub: member.id, email: member.email, type: "refresh" } satisfies MemberTokenPayload,
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_TTL },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify an access token and return its payload.
   */
  verifyAccessToken(token: string): MemberTokenPayload {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as unknown as MemberTokenPayload;
      if (payload.type !== "access") {
        throw ErrorWithCode.Factory.Unauthorized("Invalid token type");
      }
      return payload;
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.Unauthorized("Invalid or expired access token");
    }
  }

  /**
   * Verify a refresh token and return its payload.
   */
  verifyRefreshToken(token: string): MemberTokenPayload {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as unknown as MemberTokenPayload;
      if (payload.type !== "refresh") {
        throw ErrorWithCode.Factory.Unauthorized("Invalid token type");
      }
      return payload;
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.Unauthorized("Invalid or expired refresh token");
    }
  }
}
