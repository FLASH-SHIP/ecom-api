import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import bcrypt from "bcryptjs";
import type { UserRepository } from "../repositories/UserRepository";

/** Minimal interface for media cleanup — avoids importing the full MediaFileService module */
interface IMediaFileCleanup {
  deleteByUrl(url: string): Promise<boolean>;
}

interface IAuthServiceDeps {
  userRepo: UserRepository;
  /** Optional — required for avatar cleanup on profile update */
  mediaFileService?: IMediaFileCleanup;
}

export class AuthService {
  private deps: IAuthServiceDeps;
  constructor(deps: IAuthServiceDeps) {
    this.deps = deps;
  }

  /**
   * Validate user credentials for login.
   * Returns user data without sensitive fields if valid, null otherwise.
   */
  async validateCredentials(email: string, password: string) {
    const user = await this.deps.userRepo.findByEmail(email);

    if (!user) return null;
    if (user.status !== "ACTIVE") return null;
    if (!user.password?.hash) return null;

    const isValid = await bcrypt.compare(password, user.password.hash);
    if (!isValid) return null;

    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Get user profile with roles and permissions.
   */
  async getUserWithPermissions(userId: number) {
    const user = await this.deps.userRepo.findByIdWithRoles(userId);
    if (!user) {
      throw ErrorWithCode.Factory.NotFound("User not found");
    }

    const permissions = user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.name));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      username: user.username,
      locale: user.locale,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
        displayName: r.role.displayName,
      })),
      permissions: [...new Set(permissions)],
    };
  }

  /**
   * Update user profile fields.
   * - Validates username uniqueness before update
   * - Cleans up old avatar from storage + DB when avatarUrl changes
   */
  async updateProfile(
    userId: number,
    data: {
      name?: string;
      username?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      locale?: string;
    },
  ) {
    // Validate username uniqueness
    if (data.username) {
      const existing = await this.deps.userRepo.findByUsername(data.username);
      if (existing && existing.id !== userId) {
        throw new ErrorWithCode(ErrorCode.Conflict, "Tên đăng nhập đã được sử dụng");
      }
    }

    // Clean up old avatar when a new one is uploaded
    if (data.avatarUrl !== undefined && data.avatarUrl !== null && this.deps.mediaFileService) {
      const current = await this.deps.userRepo.findById(userId);
      if (current?.avatarUrl && current.avatarUrl !== data.avatarUrl) {
        // Fire-and-forget: don't block profile update if cleanup fails
        void this.deps.mediaFileService.deleteByUrl(current.avatarUrl).catch(() => undefined);
      }
    }

    return this.deps.userRepo.updateProfile(userId, data);
  }

  /**
   * Change password with optional current-password verification.
   *
   * - When `skipCurrentPasswordCheck` is false (default, self-change):
   *   `currentPassword` must be provided and must match the stored hash.
   * - When `skipCurrentPasswordCheck` is true (admin override):
   *   the current password is not checked.
   */
  async changePassword(
    userId: number,
    opts: {
      currentPassword?: string;
      newPassword: string;
      skipCurrentPasswordCheck?: boolean;
    },
  ) {
    if (!opts.skipCurrentPasswordCheck) {
      // Self-change: verify current password
      const user = await this.deps.userRepo.findByIdWithPassword(userId);
      if (!user) throw ErrorWithCode.Factory.NotFound("User not found");
      if (!user.password?.hash) {
        // No password set — allow setting one without verification
      } else if (!opts.currentPassword) {
        throw new ErrorWithCode(ErrorCode.Forbidden, "Current password required");
      } else {
        const isValid = await bcrypt.compare(opts.currentPassword, user.password.hash);
        if (!isValid) {
          throw new ErrorWithCode(ErrorCode.Forbidden, "Current password is incorrect");
        }
      }
    }

    const hash = await bcrypt.hash(opts.newPassword, 12);
    await this.deps.userRepo.updatePassword(userId, hash);
    return { success: true };
  }

  /**
   * Get user's theme preference from user_meta.
   * Returns "light" as default if not set.
   */
  async getTheme(userId: number): Promise<"light" | "dark"> {
    const value = await this.deps.userRepo.getMeta(userId, "theme");
    return value === "dark" ? "dark" : "light";
  }

  /**
   * Set user's theme preference in user_meta.
   */
  async setTheme(userId: number, theme: "light" | "dark"): Promise<void> {
    await this.deps.userRepo.setMeta(userId, "theme", theme);
  }
}
