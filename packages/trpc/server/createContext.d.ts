import type { AuthUser } from "@flash-ship/ecom-types";
export interface Context {
    user: AuthUser | null;
    ip: string | null;
    userAgent: string | null;
    /** Resolved locale code for the request (ref_lang > X-Locale > default) */
    locale: string | null;
    sessionToken: string | null;
}
/**
 * Creates the tRPC context for each request.
 * In Next.js, the session user is injected by the tRPC handler.
 */
export declare function createContext(opts: {
    user: AuthUser | null;
    ip?: string | null;
    userAgent?: string | null;
    locale?: string | null;
    sessionToken?: string | null;
}): Context;
//# sourceMappingURL=createContext.d.ts.map