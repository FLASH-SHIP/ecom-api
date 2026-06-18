import type { AuthUser } from "@ecom/types";

export interface Context {
  user: AuthUser | null;
  ip: string | null;
  userAgent: string | null;
  /** Resolved locale code for the request (ref_lang > X-Locale > default) */
  locale: string | null;
}

/**
 * Creates the tRPC context for each request.
 * In Next.js, the session user is injected by the tRPC handler.
 */
export function createContext(opts: {
  user: AuthUser | null;
  ip?: string | null;
  userAgent?: string | null;
  locale?: string | null;
}): Context {
  return {
    user: opts.user,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
    locale: opts.locale ?? null,
  };
}
