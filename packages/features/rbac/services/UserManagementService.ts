import type { UserRepository } from "@ecom/features/rbac/repositories/UserRepository";
import { hashPassword } from "@ecom/lib/crypto";
import { ErrorWithCode } from "@ecom/lib/errors";
import { RedisCache } from "@ecom/lib/redis";
import type { UserStatus } from "@ecom/prisma";

const permissionsCache = new RedisCache<string[]>("user-permissions");

export interface IUserManagementServiceDeps {
  userRepo: UserRepository;
}

export class UserManagementService {
  private deps: IUserManagementServiceDeps;
  constructor(deps: IUserManagementServiceDeps) {
    this.deps = deps;
  }

  async listUsers(params: {
    search?: string;
    status?: UserStatus;
    page?: number;
    perPage?: number;
  }) {
    return this.deps.userRepo.findMany(params);
  }

  async getUser(id: number) {
    const user = await this.deps.userRepo.findById(id);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }
    return user;
  }

  async createUser(data: {
    email: string;
    name?: string;
    username?: string;
    phone?: string | null;
    password: string;
    locale?: string;
    roleIds?: string[];
  }) {
    const existing = await this.deps.userRepo.findByEmail(data.email);
    if (existing) {
      throw ErrorWithCode.Factory.Conflict("Email already in use");
    }

    const { password, roleIds, ...userData } = data;
    const user = await this.deps.userRepo.create(userData);

    const hash = await hashPassword(password);
    await this.deps.userRepo.setPassword(user.id, hash);

    if (roleIds && roleIds.length > 0) {
      await this.deps.userRepo.syncRoles(user.id, roleIds);
    }

    return this.deps.userRepo.findById(user.id);
  }

  async updateUser(
    id: number,
    data: {
      name?: string;
      username?: string;
      phone?: string | null;
      avatarUrl?: string;
      locale?: string;
      status?: UserStatus;
    },
  ) {
    const user = await this.deps.userRepo.findById(id);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }
    return this.deps.userRepo.update(id, data);
  }

  async changePassword(userId: number, newPassword: string) {
    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }
    const hash = await hashPassword(newPassword);
    await this.deps.userRepo.setPassword(userId, hash);
  }

  async syncRoles(userId: number, roleIds: string[]) {
    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }
    await this.deps.userRepo.syncRoles(userId, roleIds);
    await permissionsCache.invalidate(`user:${userId}`).catch(() => {});
    return this.deps.userRepo.findById(userId);
  }

  async deleteUser(userId: number, currentUserId: number) {
    if (userId === currentUserId) {
      throw ErrorWithCode.Factory.Forbidden("Cannot delete your own account");
    }

    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }

    const result = await this.deps.userRepo.delete(userId);
    await permissionsCache.invalidate(`user:${userId}`).catch(() => {});
    return result;
  }

  async toggleSuperAdmin(userId: number, isSuperAdmin: boolean) {
    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }
    await this.deps.userRepo.toggleSuperAdmin(userId, isSuperAdmin);
    await permissionsCache.invalidate(`user:${userId}`).catch(() => {});
    return this.deps.userRepo.findById(userId);
  }
}
