import { BaseTransformer } from "@flash-ship/ecom-lib";

export interface UserResponseDto {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  phone: string | null;
  status: string;
  locale: string | null;
  avatarUrl: string | null;
  createdAt: string;
  roles: Array<{
    role: {
      id: number;
      name: string;
      displayName: string | null;
    };
  }>;
}

export interface UserInput {
  id: string;
  email?: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  status?: string;
  locale?: string | null;
  avatarUrl?: string | null;
  createdAt?: Date | string;
  roles?: Array<{
    role: {
      id: number;
      name: string;
      displayName: string | null;
    };
  }>;
}

export class UserTransformer extends BaseTransformer<UserInput, UserResponseDto> {
  transform(user: UserInput): UserResponseDto {
    return {
      id: user.id,
      email: user.email ?? "",
      name: user.name ?? null,
      username: user.username ?? null,
      phone: user.phone ?? null,
      status: user.status ?? "ACTIVE",
      locale: user.locale ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : (user.createdAt ?? new Date().toISOString()),
      roles: Array.isArray(user.roles)
        ? user.roles.map((r) => ({
            role: {
              id: r.role.id,
              name: r.role.name,
              displayName: r.role.displayName ?? null,
            },
          }))
        : [],
    };
  }
}
