import crypto from "node:crypto";
import { env } from "@admin/env";
import { getAuthService } from "@ecom/features/di/containers/AuthService";
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
  accessToken: "accessToken",
  refreshToken: "refreshToken",
} as const;

/** Delete an expired/invalid admin session from DB and cache */
async function deleteAdminSession(sessionId: string, cacheKey: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  await invalidateCachedSession(cacheKey);
}

const adminAdapter = {
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

    const created = await prisma.session.create({
      data: {
        sessionToken: session.sessionToken,
        userId: Number(session.userId),
        expires: session.expires,
        ipAddress,
        userAgent,
      },
    });
    return {
      id: created.id,
      sessionToken: created.sessionToken,
      userId: String(created.userId),
      expires: created.expires,
    };
  },
  async getSessionAndUser(sessionToken: string) {
    const dbSession = await prisma.session.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        expires: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
          },
        },
      },
    });
    if (!dbSession || dbSession.expires < new Date()) {
      if (dbSession) {
        await prisma.session.delete({ where: { sessionToken } }).catch(() => {});
      }
      return null;
    }
    return {
      session: {
        id: dbSession.id,
        sessionToken: dbSession.sessionToken,
        userId: String(dbSession.userId),
        expires: dbSession.expires,
      },
      user: {
        id: String(dbSession.user.id),
        email: dbSession.user.email,
        name: dbSession.user.name,
        emailVerified: dbSession.user.emailVerified,
      },
    };
  },
  async updateSession(session: { sessionToken: string; expires?: Date; userId?: string }) {
    const updated = await prisma.session.update({
      where: { sessionToken: session.sessionToken },
      data: {
        expires: session.expires,
      },
    });
    return {
      id: updated.id,
      sessionToken: updated.sessionToken,
      userId: String(updated.userId),
      expires: updated.expires,
    };
  },
  async deleteSession(sessionToken: string) {
    await prisma.session
      .delete({
        where: { sessionToken },
      })
      .catch(() => {});

    await invalidateCachedSession(`admin_session:${sessionToken}`);
  },
};

const nextAuth: NextAuthResult = NextAuth({
  adapter: adminAdapter,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  debug: env.NODE_ENV === "development",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const authService = getAuthService();
        const user = await authService.validateCredentials(email, password);
        if (!user) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user) {
        const sessionToken = crypto.randomUUID();
        const now = new Date();
        const expires = new Date(
          now.getTime() + env.ADMIN_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
        );

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

        await prisma.session.create({
          data: {
            sessionToken,
            userId: Number(user.id),
            expires,
            loginAt: now,
            lastActiveAt: now,
            ipAddress,
            userAgent,
          },
        });

        // Enforce max sessions per user — evict oldest sessions
        const maxSessions = env.ADMIN_MAX_SESSIONS_PER_USER;
        const existingSessions = await prisma.session.findMany({
          where: { userId: Number(user.id) },
          orderBy: { lastActiveAt: "asc" },
          select: { id: true },
        });

        if (existingSessions.length > maxSessions) {
          const sessionsToDelete = existingSessions.slice(0, existingSessions.length - maxSessions);
          await prisma.session
            .deleteMany({
              where: { id: { in: sessionsToDelete.map((s) => s.id) } },
            })
            .catch(() => {});
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
        displayName: (token.name as string) ?? (token.email as string) ?? "User",
        email: (token.email as string) ?? undefined,
        photoURL: (token.avatarUrl as string) ?? undefined,
        role: (token.roles as string[]) ?? [],
        loginRedirectUrl: "/",
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
      const cacheKey = `admin_session:${sessionToken}`;
      const cacheTtl = env.ADMIN_SESSION_CACHE_TTL_SEC;

      if (cacheTtl > 0) {
        const cached = await getCachedSession(cacheKey);
        if (cached) return cached;
      }

      const dbSession = await prisma.session.findUnique({
        where: { sessionToken },
        select: {
          id: true,
          sessionToken: true,
          userId: true,
          expires: true,
          loginAt: true,
          lastActiveAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              roles: {
                select: {
                  role: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      if (!dbSession || dbSession.expires < new Date()) {
        if (dbSession) {
          await deleteAdminSession(dbSession.id, cacheKey);
        }
        return {};
      }

      const now = Date.now();

      // 1️⃣ Absolute Timeout — hard stop after configured hours from login
      const absoluteMaxMs = env.ADMIN_SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;
      if (now - dbSession.loginAt.getTime() > absoluteMaxMs) {
        await deleteAdminSession(dbSession.id, cacheKey);
        return {};
      }

      // 2️⃣ Idle Timeout — no activity within configured hours
      const idleMaxMs = env.ADMIN_SESSION_IDLE_TIMEOUT_HOURS * 60 * 60 * 1000;
      if (now - dbSession.lastActiveAt.getTime() > idleMaxMs) {
        await deleteAdminSession(dbSession.id, cacheKey);
        return {};
      }

      const payload = {
        sessionId: dbSession.sessionToken,
        id: dbSession.user.id,
        email: dbSession.user.email,
        name: dbSession.user.name,
        avatarUrl: dbSession.user.avatarUrl,
        roles: dbSession.user.roles.map((r) => r.role.name),
      };

      // 3️⃣ Sliding Window + Batched lastActiveAt update (every 5 min)
      const sessionMaxAgeMs = env.ADMIN_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      const threshold = sessionMaxAgeMs * 0.25;
      const timeRemaining = dbSession.expires.getTime() - now;
      const ACTIVITY_BATCH_MS = 5 * 60 * 1000;
      const needsActivityUpdate = now - dbSession.lastActiveAt.getTime() > ACTIVITY_BATCH_MS;

      if (timeRemaining < threshold) {
        const newExpires = new Date(now + sessionMaxAgeMs);
        await prisma.session
          .update({
            where: { id: dbSession.id },
            data: { expires: newExpires, lastActiveAt: new Date() },
          })
          .catch(() => {});
        await invalidateCachedSession(cacheKey);
      } else if (needsActivityUpdate) {
        await prisma.session
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
        await prisma.session
          .delete({
            where: { sessionToken },
          })
          .catch(() => {});

        await invalidateCachedSession(`admin_session:${sessionToken}`);
      }
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export default nextAuth;
