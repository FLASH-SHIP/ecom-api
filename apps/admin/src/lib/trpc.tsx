"use client";

import type { AppRouter } from "@ecom/trpc/server/routers/_app";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

let redirecting = false;

function handleUnauthorized(error: unknown) {
  if (redirecting || typeof window === "undefined") return;
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { httpStatus?: number } }).data;
    if (data?.httpStatus === 401) {
      redirecting = true;
      window.location.href = "/login";
    }
  }
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const data = (error as { data?: { httpStatus?: number } }).data;
              if (data?.httpStatus === 401) return false;
              return failureCount < 3;
            },
          },
          mutations: {
            onError: handleUnauthorized,
          },
        },
        queryCache: new QueryCache({
          onError: handleUnauthorized,
        }),
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          // biome-ignore lint/suspicious/noExplicitAny: tRPC v11 uses TypeError<> sentinel type for transformer — superjson satisfies DataTransformer at runtime but TypeScript blocks the cast
          transformer: superjson as any,
          headers() {
            const headers: Record<string, string> = {};
            if (typeof window !== "undefined") {
              const params = new URLSearchParams(window.location.search);
              const refLang = params.get("ref_lang");
              if (refLang) {
                headers["x-locale"] = refLang;
              }
            }
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
