import { auth } from "@customer/lib/auth";
import { defaultLocale } from "@ecom/i18n";
import { prisma } from "@ecom/prisma";
import { appRouter, createContext } from "@ecom/trpc/server";
import type { AuthUser } from "@ecom/types";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = async (req: Request) => {
  const session = await auth();

  let user: AuthUser | null = null;

  if (session?.user?.id) {
    const customerId = Number(session.user.id);
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    if (dbCustomer) {
      user = {
        id: dbCustomer.id,
        email: dbCustomer.email,
        name: dbCustomer.name,
        username: dbCustomer.username,
        locale: null,
        permissions: ["customer"],
      };
    }
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  const url = new URL(req.url);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const nextLocaleMatch = cookieHeader.match(/(?:^|;)\s*NEXT_LOCALE\s*=\s*([^;]+)/);
  const nextLocale = nextLocaleMatch?.[1]?.trim() ?? null;

  const locale =
    url.searchParams.get("ref_lang") ?? req.headers.get("x-locale") ?? nextLocale ?? defaultLocale;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ user, ip, userAgent, locale }),
  });
};

export { handler as GET, handler as POST };
