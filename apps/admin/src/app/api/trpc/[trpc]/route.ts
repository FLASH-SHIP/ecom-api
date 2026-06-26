import { auth } from "@admin/lib/auth";
import { ALL_PERMISSIONS } from "@ecom/lib/permissions";
import { RedisCache } from "@ecom/lib/redis";
import { prisma } from "@ecom/prisma";
import { appRouter, createContext } from "@ecom/trpc/server";
import type { AuthUser } from "@ecom/types";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const permissionsCache = new RedisCache<string[]>("user-permissions", 3600); // 1 hour TTL

async function resolveUserPermissions(userId: number): Promise<string[]> {
  const cacheKey = `user:${userId}`;
  const cachedPermissions = await permissionsCache.get(cacheKey);

  if (cachedPermissions) {
    return cachedPermissions;
  }

  const roleData = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!roleData) {
    return [];
  }

  const isSuperAdmin = roleData.roles.some((r) => r.role.name === "admin");
  let permissions: string[];
  if (isSuperAdmin) {
    permissions = ALL_PERMISSIONS.map((p) => p.name);
  } else {
    permissions = roleData.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.name));
  }

  const uniquePermissions = [...new Set(permissions)];
  await permissionsCache.set(cacheKey, uniquePermissions);
  return uniquePermissions;
}

const handler = async (req: Request) => {
  const session = await auth();

  let user: AuthUser | null = null;

  if (session?.user?.id) {
    const userId = Number(session.user.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        locale: true,
      },
    });

    if (dbUser) {
      const cachedPermissions = await resolveUserPermissions(userId);
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        username: dbUser.username,
        locale: dbUser.locale,
        permissions: cachedPermissions,
      };
    }
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const url = new URL(req.url);
  const locale = url.searchParams.get("ref_lang") ?? req.headers.get("x-locale") ?? null;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ user, ip, userAgent, locale }),
  });
};

export { handler as GET, handler as POST };
