import { ErrorWithCode } from "@ecom/lib/errors";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export interface CustomerTokenPayload {
  sub: number;
  email: string;
  type: "access" | "refresh";
}

export class CustomerTokenService {
  generateTokens(customer: { id: number; email: string }) {
    const jwtSecret = getJwtSecret();

    const accessToken = jwt.sign(
      { sub: customer.id, email: customer.email, type: "access" } satisfies CustomerTokenPayload,
      jwtSecret,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = jwt.sign(
      { sub: customer.id, email: customer.email, type: "refresh" } satisfies CustomerTokenPayload,
      jwtSecret,
      { expiresIn: REFRESH_TOKEN_TTL },
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): CustomerTokenPayload {
    const jwtSecret = getJwtSecret();
    try {
      const payload = jwt.verify(token, jwtSecret) as unknown as CustomerTokenPayload;
      if (payload.type !== "access") {
        throw ErrorWithCode.Factory.Unauthorized("Invalid token type");
      }
      return payload;
    } catch (error) {
      if (error instanceof ErrorWithCode) throw error;
      throw ErrorWithCode.Factory.Unauthorized("Invalid or expired access token");
    }
  }

  verifyRefreshToken(token: string): CustomerTokenPayload {
    const jwtSecret = getJwtSecret();
    try {
      const payload = jwt.verify(token, jwtSecret) as unknown as CustomerTokenPayload;
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
