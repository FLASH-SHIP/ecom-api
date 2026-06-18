import { appRouter, createContext } from "@ecom/trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const locale = url.searchParams.get("ref_lang") ?? req.headers.get("x-locale") ?? null;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ user: null, locale }),
  });
};

export { handler as GET, handler as POST };
