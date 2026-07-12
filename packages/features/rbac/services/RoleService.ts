import type { PermissionRepository } from "@ecom/features/rbac/repositories/PermissionRepository";
import type { RoleRepository } from "@ecom/features/rbac/repositories/RoleRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { RedisCache } from "@ecom/lib/redis";

const permissionsCache = new RedisCache<string[]>("user-permissions");

export interface IRoleServiceDeps {
  roleRepo: RoleRepository;
  permissionRepo: PermissionRepository;
}

export class RoleService {
  private deps: IRoleServiceDeps;
  constructor(deps: IRoleServiceDeps) {
    this.deps = deps;
  }

  async listRoles() {
    return this.deps.roleRepo.findMany();
  }

  async getRole(id: number) {
    const role = await this.deps.roleRepo.findById(id);
    if (!role) {
      throw ErrorWithCode.Factory.NotFound("Role not found");
    }
    return role;
  }

  async createRole(data: { name: string; displayName?: string; description?: string }) {
    const existing = await this.deps.roleRepo.findByName(data.name);
    if (existing) {
      throw ErrorWithCode.Factory.Conflict("Role name already exists");
    }
    return this.deps.roleRepo.create(data);
  }

  async updateRole(id: number, data: { displayName?: string; description?: string }) {
    const role = await this.deps.roleRepo.findById(id);
    if (!role) {
      throw ErrorWithCode.Factory.NotFound("Role not found");
    }
    return this.deps.roleRepo.update(id, data);
  }

  async deleteRole(id: number) {
    const role = await this.deps.roleRepo.findById(id);
    if (!role) {
      throw ErrorWithCode.Factory.NotFound("Role not found");
    }

    if (role.name === "admin") {
      throw ErrorWithCode.Factory.Forbidden("Cannot delete the admin role");
    }

    return this.deps.roleRepo.delete(id);
  }

  async syncPermissions(roleId: number, permissionIds: number[]) {
    const role = await this.deps.roleRepo.findById(roleId);
    if (!role) {
      throw ErrorWithCode.Factory.NotFound("Role not found");
    }

    // Validate that all permission IDs exist
    if (permissionIds.length > 0) {
      const existingPerms = await this.deps.permissionRepo.findByIds(permissionIds);
      if (existingPerms.length !== permissionIds.length) {
        throw ErrorWithCode.Factory.BadRequest("Some permission IDs are invalid");
      }
    }

    await this.deps.roleRepo.syncPermissions(roleId, permissionIds);
    await permissionsCache.clear().catch(() => {});
    return this.deps.roleRepo.findById(roleId);
  }

  async listPermissions() {
    const permissions = await this.deps.permissionRepo.findAll();

    // Group permissions by group name
    const grouped = new Map<string, typeof permissions>();
    for (const perm of permissions) {
      const group = perm.group ?? "other";
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)?.push(perm);
    }

    return Object.fromEntries(grouped);
  }
}
