import crypto from "node:crypto";
import { env } from "@customer/env";
import { getCustomerAuthService } from "@ecom/features/di/containers/CustomerService";
import { getRedisClient } from "@ecom/lib/redis";
import { prisma } from "@ecom/prisma";
import type { User as AppUser } from "@ecom/shared/@auth/user";
import type { NextAuthResult } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const AUTH_KEYS = {
  accessToken: "customerAccessToken",
  refreshToken: "customerRefreshToken",
} as const;

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
      include: { customer: true },
    });
    if (
      !dbSession ||
      dbSession.expires < new Date() ||
      dbSession.customer.status !== "ACTIVE" ||
      dbSession.customer.deletedAt !== null
    ) {
      if (dbSession) {
        await prisma.customerSession.delete({ where: { sessionToken } }).catch(() => {});
        try {
          const redis = getRedisClient();
          await redis.del(cacheKey);
        } catch {
          // Ignore
        }
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

    try {
      const redis = getRedisClient();
      await redis.set(cacheKey, JSON.stringify(result), "EX", env.CUSTOMER_SESSION_CACHE_TTL_SEC);
    } catch {
      // Ignore
    }

    return result;
  },
  async updateSession(session: { sessionToken: string; expires?: Date; userId?: string }) {
    const updated = await prisma.customerSession.update({
      where: { sessionToken: session.sessionToken },
      data: {
        expires: session.expires,
      },
    });

    try {
      const redis = getRedisClient();
      await redis.del(`customer_session:${session.sessionToken}`);
    } catch {
      // Ignore
    }

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

    try {
      const redis = getRedisClient();
      await redis.del(`customer_session:${sessionToken}`);
    } catch {
      // Ignore
    }
  },
};

const nextAuth: NextAuthResult = NextAuth({
  adapter: customerAdapter,
  secret: env.AUTH_SECRET,
  session: { strategy: "database" },
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
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
            ipAddress,
            userAgent,
          },
        });

        token.sessionId = sessionToken;
        token.id = Number(user.id);
      }
      return token;
    },
    async session({ session, user }) {
      if (user?.id) {
        session.user.id = user.id;

        const dbCustomer = await prisma.customer.findUnique({
          where: { id: Number(user.id) },
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        });

        if (dbCustomer) {
          const appUser: AppUser = {
            id: String(dbCustomer.id),
            displayName: dbCustomer.name ?? dbCustomer.email ?? "Customer",
            email: dbCustomer.email ?? undefined,
            photoURL: dbCustomer.avatarUrl ?? undefined,
            role: ["customer"], // Standard customer role
            loginRedirectUrl: "/customer/dashboard",
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
    async decode() {
      return null;
    },
  },
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export default nextAuth;
