import { ALL_PERMISSIONS } from "@ecom/lib/permissions";

export interface UserRolePermissionSource {
  roles?: Array<{
    role: {
      name: string;
      permissions?: Array<{
        permission: {
          name: string;
        };
      }>;
    };
  }>;
}

/**
 * Resolve unique permissions for a user from their roles.
 * Super Admin (`admin` role) automatically receives all system permissions.
 */
export function resolveUserPermissions(
  user: UserRolePermissionSource | null | undefined,
): string[] {
  if (!user?.roles || user.roles.length === 0) {
    return [];
  }

  const isSuperAdmin = user.roles.some((r) => r.role?.name === "admin");
  if (isSuperAdmin) {
    return ALL_PERMISSIONS.map((p) => p.name);
  }

  const permissions = user.roles.flatMap(
    (r) =>
      r.role?.permissions
        ?.map((p) => p.permission?.name)
        .filter((name): name is string => Boolean(name)) ?? [],
  );

  return [...new Set(permissions)];
}
