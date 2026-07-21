import { ApiKeyRepository } from "@ecom/features/auth/repositories/ApiKeyRepository";
import { UserRepository } from "@ecom/features/auth/repositories/UserRepository";
import { ApiAuthService } from "@ecom/features/auth/services/ApiAuthService";
import { AuthService } from "@ecom/features/auth/services/AuthService";
import { prisma } from "@ecom/prisma";
import { getCustomerRepository } from "./CustomerService";

let _authService: AuthService | null = null;
let _apiAuthService: ApiAuthService | null = null;
let _userRepository: UserRepository | null = null;
let _apiKeyRepository: ApiKeyRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!_userRepository) {
    _userRepository = new UserRepository(prisma);
  }
  return _userRepository;
}

export function getApiKeyRepository(): ApiKeyRepository {
  if (!_apiKeyRepository) {
    _apiKeyRepository = new ApiKeyRepository(prisma);
  }
  return _apiKeyRepository;
}

export function getAuthService(): AuthService {
  if (!_authService) {
    // Lazy-require MediaFileService to avoid pulling the full media module graph
    // into API v2's tsconfig scope (which has pre-existing module-resolution limits).
    // API v2 only calls getApiAuthService(), so this path is never reached there.
    let _mediaFileService: { deleteByUrl: (url: string) => Promise<boolean> } | undefined;
    try {
      // Handle both CJS and ESM module formats (Turbopack wraps ESM differently)
      const mod = require("@ecom/features/di/containers/MediaService");
      const fn = mod.getMediaFileService ?? mod.default?.getMediaFileService;
      if (typeof fn === "function") {
        _mediaFileService = fn();
      }
    } catch {
      // MediaFileService is optional — avatar cleanup will be skipped
    }
    _authService = new AuthService({
      userRepo: getUserRepository(),
    });
  }
  return _authService;
}

export function getApiAuthService(): ApiAuthService {
  if (!_apiAuthService) {
    _apiAuthService = new ApiAuthService({
      apiKeyRepo: getApiKeyRepository(),
      userRepo: getUserRepository(),
      customerRepo: getCustomerRepository(),
    });
  }
  return _apiAuthService;
}

/**
 * Reset all containers — for testing only.
 */
export function resetContainers(): void {
  _authService = null;
  _apiAuthService = null;
  _userRepository = null;
  _apiKeyRepository = null;
}
