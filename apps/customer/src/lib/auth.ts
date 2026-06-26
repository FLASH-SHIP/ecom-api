import crypto from "node:crypto";
import { env } from "@customer/env";
import { getCustomerAuthService } from "@ecom/features/di/containers/CustomerService";
import { getRedisClient } from "@ecom/lib/redis";
import {
  getCachedSession,
  invalidateCachedSession,
  setCachedSession,
} from "@ecom/lib/session-cache";
import { prisma } from "@ecom/prisma";
import type { User as AppUser } from "@ecom/shared/@auth/user";
import type { NextAuthResult } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const AUTH_KEYS = {
  accessToken: "customerAccessToken",
  refreshToken: "customerRefreshToken",
} as const;

/** Delete an expired/invalid customer session from DB and cache */
async function deleteCustomerSession(sessionId: string, cacheKey: string) {
  await prisma.customerSession.delete({ where: { id: sessionId } }).catch(() => {});
  await invalidateCachedSession(cacheKey);
}

const customerAdapter = {
  async createSession(session: { sessionToken: string; userId: string; expires: Date }) {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const { headers } = await import("next/headers");
      const reqHeaders = await headers();
      ipAddress =
        reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        reqHeaders.get("x-real-ip") ||
        null;
      userAgent = reqHeaders.get("user-agent") || null;
    } catch {
      // Ignore
    }

    const created = await prisma.customerSession.create({
      data: {
        sessionToken: session.sessionToken,
        customerId: Number(session.userId),
        expires: session.expires,
        ipAddress,
        userAgent,
      },
    });
    return {
      id: created.id,
      sessionToken: created.sessionToken,
      userId: String(created.customerId),
      expires: created.expires,
    };
  },
  async getSessionAndUser(sessionToken: string) {
    const cacheKey = `customer_session:${sessionToken}`;
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Deserialize dates
        parsed.session.expires = new Date(parsed.session.expires);
        if (parsed.user.emailVerified) {
          parsed.user.emailVerified = new Date(parsed.user.emailVerified);
        }
        return parsed;
      }
    } catch {
      // Fallback to database query on Redis failure
    }

    const dbSession = await prisma.customerSession.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        sessionToken: true,
        customerId: true,
        expires: true,
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
    if (
      !dbSession ||
      dbSession.expires < new Date() ||
      dbSession.customer.status !== "ACTIVE" ||
      dbSession.customer.deletedAt !== null
    ) {
      if (dbSession) {
        await prisma.customerSession.delete({ where: { sessionToken } }).catch(() => {});
        await invalidateCachedSession(cacheKey);
      }
      return null;
    }

    const result = {
      session: {
        id: dbSession.id,
        sessionToken: dbSession.sessionToken,
        userId: String(dbSession.customerId),
        expires: dbSession.expires,
      },
      user: {
        id: String(dbSession.customer.id),
        email: dbSession.customer.email,
        name: dbSession.customer.name,
        emailVerified: dbSession.customer.emailVerified,
      },
    };

    await setCachedSession(cacheKey, result, env.CUSTOMER_SESSION_CACHE_TTL_SEC);

    return result;
  },
  async updateSession(session: { sessionToken: string; expires?: Date; userId?: string }) {
    const updated = await prisma.customerSession.update({
      where: { sessionToken: session.sessionToken },
      data: {
        expires: session.expires,
      },
    });

    await invalidateCachedSession(`customer_session:${session.sessionToken}`);

    return {
      id: updated.id,
      sessionToken: updated.sessionToken,
      userId: String(updated.customerId),
      expires: updated.expires,
    };
  },
  async deleteSession(sessionToken: string) {
    await prisma.customerSession
      .delete({
        where: { sessionToken },
      })
      .catch(() => {});

    await invalidateCachedSession(`customer_session:${sessionToken}`);
  },
};

const nextAuth: NextAuthResult = NextAuth({
  adapter: customerAdapter,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  debug: env.NODE_ENV === "development",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        const authService = getCustomerAuthService();
        try {
          const customer = await authService.login(identifier, password);
          if (!customer) return null;

          return {
            id: String(customer.id),
            email: customer.email,
            name: customer.name,
          };
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user) {
        const sessionToken = crypto.randomUUID();
        const now = new Date();
        const sessionMaxAgeMs = env.CUSTOMER_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        const expires = new Date(now.getTime() + sessionMaxAgeMs);

        let ipAddress: string | null = null;
        let userAgent: string | null = null;
        try {
          const { headers } = await import("next/headers");
          const reqHeaders = await headers();
          ipAddress =
            reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            reqHeaders.get("x-real-ip") ||
            null;
          userAgent = reqHeaders.get("user-agent") || null;
        } catch {
          // Ignore
        }

        await prisma.customerSession.create({
          data: {
            sessionToken,
            customerId: Number(user.id),
            expires,
            loginAt: now,
            lastActiveAt: now,
            ipAddress,
            userAgent,
          },
        });

        // Enforce max sessions per user — evict oldest sessions (excluding the current session)
        const maxSessions = env.CUSTOMER_MAX_SESSIONS_PER_USER;
        const existingSessions = await prisma.customerSession.findMany({
          where: { customerId: Number(user.id) },
          orderBy: { lastActiveAt: "asc" },
          select: { id: true, sessionToken: true },
        });

        if (existingSessions.length > maxSessions) {
          const sessionsToDelete = existingSessions
            .filter((s) => s.sessionToken !== sessionToken)
            .slice(0, existingSessions.length - maxSessions);

          if (sessionsToDelete.length > 0) {
            await prisma.customerSession
              .deleteMany({
                where: { id: { in: sessionsToDelete.map((s) => s.id) } },
              })
              .catch(() => {});
          }
        }

        token.sessionId = sessionToken;
        token.id = Number(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      const id = token?.id ? String(token.id) : null;
      if (!id) return session;

      session.user.id = id;

      // Use cached user data from decode() payload — no extra DB query
      const appUser: AppUser = {
        id,
        displayName: (token.name as string) ?? (token.email as string) ?? "Customer",
        email: (token.email as string) ?? undefined,
        photoURL: (token.avatarUrl as string) ?? undefined,
        role: ["customer"],
        loginRedirectUrl: "/dashboard",
      };
      session.db = appUser;

      return session;
    },
  },
  jwt: {
    async encode(params) {
      if (params.token?.sessionId) {
        return params.token.sessionId as string;
      }
      return "";
    },
    async decode(params) {
      if (!params.token) return {};

      const sessionToken = params.token;
      const cacheKey = `customer_session:${sessionToken}`;
      const cacheTtl = env.CUSTOMER_SESSION_CACHE_TTL_SEC;

      if (cacheTtl > 0) {
        const cached = await getCachedSession(cacheKey);
        if (cached) return cached;
      }

      const dbSession = await prisma.customerSession.findUnique({
        where: { sessionToken },
        select: {
          id: true,
          sessionToken: true,
          customerId: true,
          expires: true,
          loginAt: true,
          lastActiveAt: true,
          customer: {
            select: {
              id: true,
              email: true,
              name: true,
              emailVerified: true,
              status: true,
              deletedAt: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (
        !dbSession ||
        dbSession.expires < new Date() ||
        dbSession.customer.status !== "ACTIVE" ||
        dbSession.customer.deletedAt !== null
      ) {
        if (dbSession) {
          await deleteCustomerSession(dbSession.id, cacheKey);
        }
        return {};
      }

      const now = Date.now();

      // 1️⃣ Absolute Timeout — hard stop after configured days from login
      const absoluteMaxMs = env.CUSTOMER_SESSION_ABSOLUTE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
      if (now - dbSession.loginAt.getTime() > absoluteMaxMs) {
        await deleteCustomerSession(dbSession.id, cacheKey);
        return {};
      }

      // 2️⃣ Idle Timeout — no activity within configured days
      const idleMaxMs = env.CUSTOMER_SESSION_IDLE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
      if (now - dbSession.lastActiveAt.getTime() > idleMaxMs) {
        await deleteCustomerSession(dbSession.id, cacheKey);
        return {};
      }

      const payload = {
        sessionId: dbSession.sessionToken,
        id: dbSession.customer.id,
        email: dbSession.customer.email,
        name: dbSession.customer.name,
        avatarUrl: dbSession.customer.avatarUrl,
      };

      // 3️⃣ Sliding Window + Batched lastActiveAt update (every 5 min)
      const sessionMaxAgeMs = env.CUSTOMER_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      const halfLife = sessionMaxAgeMs / 2;
      const timeRemaining = dbSession.expires.getTime() - now;
      const ACTIVITY_BATCH_MS = 5 * 60 * 1000;
      const needsActivityUpdate = now - dbSession.lastActiveAt.getTime() > ACTIVITY_BATCH_MS;

      if (timeRemaining < halfLife) {
        const newExpires = new Date(now + sessionMaxAgeMs);
        await prisma.customerSession
          .update({
            where: { id: dbSession.id },
            data: { expires: newExpires, lastActiveAt: new Date() },
          })
          .catch(() => {});
        await invalidateCachedSession(cacheKey);
      } else if (needsActivityUpdate) {
        await prisma.customerSession
          .update({
            where: { id: dbSession.id },
            data: { lastActiveAt: new Date() },
          })
          .catch(() => {});
      }

      if (cacheTtl > 0) {
        await setCachedSession(cacheKey, payload, cacheTtl);
      }

      return payload;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const sessionToken = token?.sessionId as string | undefined;

      if (sessionToken) {
        await prisma.customerSession
          .delete({
            where: { sessionToken },
          })
          .catch(() => {});

        await invalidateCachedSession(`customer_session:${sessionToken}`);
      }
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export default nextAuth;
