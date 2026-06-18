import { auth } from "@admin/lib/auth";
import { prisma } from "@ecom/prisma";
import { appRouter, createContext } from "@ecom/trpc/server";
import type { AuthUser } from "@ecom/types";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

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
        roles: {
          select: {
            role: {
              select: {
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

    if (dbUser) {
      const permissions = dbUser.roles.flatMap((r) =>
        r.role.permissions.map((p) => p.permission.name),
      );
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        username: dbUser.username,
        locale: dbUser.locale,
        permissions: [...new Set(permissions)],
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
