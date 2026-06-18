import { PermissionRepository } from "@ecom/features/rbac/repositories/PermissionRepository";
import { RoleRepository } from "@ecom/features/rbac/repositories/RoleRepository";
import { UserRepository } from "@ecom/features/rbac/repositories/UserRepository";
import { RoleService } from "@ecom/features/rbac/services/RoleService";
import { UserManagementService } from "@ecom/features/rbac/services/UserManagementService";
import { prisma } from "@ecom/prisma";

// Repositories
let _roleRepository: RoleRepository | null = null;
let _permissionRepository: PermissionRepository | null = null;
let _userRepository: UserRepository | null = null;

// Services
let _roleService: RoleService | null = null;
let _userManagementService: UserManagementService | null = null;

// ─── Repositories ───────────────────────────────────

export function getRoleRepository(): RoleRepository {
  if (!_roleRepository) {
    _roleRepository = new RoleRepository(prisma);
  }
  return _roleRepository;
}

export function getPermissionRepository(): PermissionRepository {
  if (!_permissionRepository) {
    _permissionRepository = new PermissionRepository(prisma);
  }
  return _permissionRepository;
}

export function getUserRepository(): UserRepository {
  if (!_userRepository) {
    _userRepository = new UserRepository(prisma);
  }
  return _userRepository;
}

// ─── Services ───────────────────────────────────────

export function getRoleService(): RoleService {
  if (!_roleService) {
    _roleService = new RoleService({
      roleRepo: getRoleRepository(),
      permissionRepo: getPermissionRepository(),
    });
  }
  return _roleService;
}

export function getUserManagementService(): UserManagementService {
  if (!_userManagementService) {
    _userManagementService = new UserManagementService({
      userRepo: getUserRepository(),
    });
  }
  return _userManagementService;
}

export function resetRbacContainers(): void {
  _roleRepository = null;
  _permissionRepository = null;
  _userRepository = null;
  _roleService = null;
  _userManagementService = null;
}
