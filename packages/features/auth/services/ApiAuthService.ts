import { createHash } from "node:crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import type { JwtPayload } from "@ecom/lib/jwt";
import { verifyToken } from "@ecom/lib/jwt";
import type { ApiKeyRepository } from "../repositories/ApiKeyRepository";
import type { UserRepository } from "../repositories/UserRepository";

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
}
