import { ApiKeyRepository } from "@ecom/features/auth/repositories/ApiKeyRepository";
import { UserRepository } from "@ecom/features/auth/repositories/UserRepository";
import { ApiAuthService } from "@ecom/features/auth/services/ApiAuthService";
import { AuthService } from "@ecom/features/auth/services/AuthService";
import { prisma } from "@ecom/prisma";

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
