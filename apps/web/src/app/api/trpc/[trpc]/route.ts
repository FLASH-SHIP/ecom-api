import { defaultLocale } from "@ecom/i18n";
import { appRouter, createContext } from "@ecom/trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = async (req: Request) => {
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
    createContext: () => createContext({ user: null, ip, userAgent, locale }),
  });
};

export { handler as GET, handler as POST };
