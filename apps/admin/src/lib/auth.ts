import crypto from "node:crypto";
import { env } from "@admin/env";
import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { getRedisClient } from "@ecom/lib/redis";
import { prisma } from "@ecom/prisma";
import type { User as AppUser } from "@ecom/shared/@auth/user";
import type { NextAuthResult } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const AUTH_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
} as const;

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
      include: { user: true },
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

    try {
      const redis = getRedisClient();
      await redis.del(`admin_session:${sessionToken}`);
    } catch (_err) {
      // Ignore cache invalidation failures
    }
  },
};

const nextAuth: NextAuthResult = NextAuth({
  adapter: adminAdapter,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  debug: true,
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
        const expires = new Date(Date.now() + env.ADMIN_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

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
            ipAddress,
            userAgent,
          },
        });

        token.sessionId = sessionToken;
        token.id = Number(user.id);
      }
      return token;
    },
    async session({ session, token, user }) {
      const userId = user?.id || (token?.id ? String(token.id) : null);
      if (userId) {
        session.user.id = userId;

        // Populate session.db for the app's useUser hook
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(userId) },
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            roles: {
              select: {
                role: { select: { name: true } },
              },
            },
          },
        });

        if (dbUser) {
          const appUser: AppUser = {
            id: String(dbUser.id),
            displayName: dbUser.name ?? dbUser.email ?? "User",
            email: dbUser.email ?? undefined,
            photoURL: dbUser.avatarUrl ?? undefined,
            role: dbUser.roles.map((r) => r.role.name),
            loginRedirectUrl: "/",
          };
          session.db = appUser;
        }
      }
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
      if (!params.token) return null;

      const sessionToken = params.token;
      const cacheKey = `admin_session:${sessionToken}`;
      const cacheTtl = env.ADMIN_SESSION_CACHE_TTL_SEC;

      if (cacheTtl > 0) {
        try {
          const redis = getRedisClient();
          const cached = await redis.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (_err) {
          // Fallback to DB query on Redis failure
        }
      }

      const dbSession = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!dbSession || dbSession.expires < new Date()) {
        if (dbSession) {
          await prisma.session.delete({ where: { id: dbSession.id } }).catch(() => {});
        }
        return null;
      }

      const payload = {
        sessionId: dbSession.sessionToken,
        id: dbSession.user.id,
        email: dbSession.user.email,
        name: dbSession.user.name,
      };

      if (cacheTtl > 0) {
        try {
          const redis = getRedisClient();
          // Cache session lookup
          await redis.set(cacheKey, JSON.stringify(payload), "EX", cacheTtl);
        } catch (_err) {
          // Ignore cache save failures
        }
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

        try {
          const redis = getRedisClient();
          await redis.del(`admin_session:${sessionToken}`);
        } catch (_err) {
          // Ignore
        }
      }
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export default nextAuth;
