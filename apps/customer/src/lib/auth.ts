import crypto from "node:crypto";
import { env } from "@customer/env";
import { getCustomerAuthService } from "@ecom/features/di/containers/CustomerService";
import { createLogger } from "@ecom/lib/logger";
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
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";

export const AUTH_KEYS = {
  accessToken: "customerAccessToken",
  refreshToken: "customerRefreshToken",
} as const;

const log = createLogger("NextAuthCustomer");

/** Delete an expired/invalid customer session from DB and cache */
async function deleteCustomerSession(sessionId: string, cacheKey: string) {
  await prisma.customerSession.delete({ where: { id: sessionId } }).catch(() => {});
  await invalidateCachedSession(cacheKey);
}

const _customerAdapter = {
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
        customerId: session.userId,
        expires: session.expires,
        ipAddress,
        userAgent,
      },
    });
    return {
      id: created.id,
      sessionToken: created.sessionToken,
      userId: created.customerId,
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
  // adapter: customerAdapter,
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  debug: env.NODE_ENV === "development",
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
    Facebook({
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
    }),
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Handles complex user provisioning and linking for multiple OAuth social providers.
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        const provider = account.provider;
        const email = profile?.email;
        const providerId = account.providerAccountId;

        log.info("🔒 NextAuth OAuth SignIn callback debug", {
          provider,
          email,
          providerId,
          profileKeys: profile ? Object.keys(profile) : [],
          profile,
        });

        if (!email || !providerId) {
          return false;
        }

        // Facebook avatar URL can be in profile.picture (if nested object or url string) or profile.image
        let avatarUrl: string | null = null;
        if (typeof profile.picture === "string") {
          avatarUrl = profile.picture;
        } else if (
          profile.picture &&
          typeof profile.picture === "object" &&
          "data" in profile.picture
        ) {
          const picData = (profile.picture as { data?: { url?: string } }).data;
          avatarUrl = picData?.url || null;
        } else if ((profile as { image?: string }).image) {
          avatarUrl = (profile as { image?: string }).image || null;
        }

        // 1. Check if the social link already exists
        const existingSocial = await prisma.customerSocialAccount.findUnique({
          where: {
            provider_providerId: {
              provider,
              providerId,
            },
          },
          select: { customerId: true },
        });

        if (existingSocial) {
          await prisma.customer.update({
            where: { id: existingSocial.customerId },
            data: { lastLoginAt: new Date() },
          });
          user.id = String(existingSocial.customerId);
          return true;
        }

        // 2. Check if a customer exists with this email address
        let customer = await prisma.customer.findUnique({
          where: { email },
          select: { id: true, status: true },
        });

        if (customer) {
          if (customer.status !== "ACTIVE") {
            return false;
          }

          // Link social account
          await prisma.customerSocialAccount.create({
            data: {
              customerId: customer.id,
              provider,
              providerId,
              email,
              name: profile.name,
              avatarUrl,
            },
          });
        } else {
          // 3. Create a new Customer and link social account
          const baseUsername =
            email
              .split("@")[0]
              ?.toLowerCase()
              .replace(/[^a-z0-9]/g, "") || "user";
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const username = `${baseUsername}${randomSuffix}`;

          customer = await prisma.customer.create({
            data: {
              id: crypto.randomUUID(),
              email,
              username,
              name: profile.name || baseUsername,
              avatarUrl,
              emailVerified: new Date(),
              lastLoginAt: new Date(),
              status: "ACTIVE",
              socialAccounts: {
                create: {
                  provider,
                  providerId,
                  email,
                  name: profile.name,
                  avatarUrl,
                },
              },
            },
            select: { id: true, status: true },
          });
        }

        if (!customer) {
          return false;
        }

        user.id = String(customer.id);
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
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
            customerId: user.id,
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
          where: { customerId: user.id },
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
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const id = (token?.id as string) || null;
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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Custom session validation checks include multiple validation steps.
    async decode(params) {
      if (!params.token) return {};

      const sessionToken = params.token;
      const cacheKey = `customer_session:${sessionToken}`;
      const cacheTtl = env.CUSTOMER_SESSION_CACHE_TTL_SEC;

      if (cacheTtl > 0) {
        const cached = await getCachedSession(cacheKey);
        if (cached) return cached;
      }

      let dbSession = null;
      let retries = 3;

      while (retries > 0) {
        try {
          dbSession = await prisma.customerSession.findUnique({
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
          break; // Success, exit retry loop
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error(
              "❌ NextAuth customer decode session DB query failed after retries:",
              error,
            );
            return {};
          }
          // Wait 150ms before retrying to allow HMR compilation to finish/Prisma connection to recover
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      if (!dbSession) {
        log.warn("Customer session not found in DB", { token: sessionToken });
        return {};
      }

      if (dbSession.expires < new Date()) {
        log.warn("Customer session expired", {
          token: sessionToken,
          expires: dbSession.expires.toISOString(),
          now: new Date().toISOString(),
        });
        await deleteCustomerSession(dbSession.id, cacheKey);
        return {};
      }

      if (dbSession.customer.status !== "ACTIVE") {
        log.warn("Customer not active", { token: sessionToken, status: dbSession.customer.status });
        await deleteCustomerSession(dbSession.id, cacheKey);
        return {};
      }

      if (dbSession.customer.deletedAt !== null) {
        log.warn("Customer is deleted", {
          token: sessionToken,
          deletedAt: dbSession.customer.deletedAt.toISOString(),
        });
        await deleteCustomerSession(dbSession.id, cacheKey);
        return {};
      }

      const now = Date.now();

      // 1️⃣ Absolute Timeout — hard stop after configured days from login
      const absoluteMaxMs = env.CUSTOMER_SESSION_ABSOLUTE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
      if (now - dbSession.loginAt.getTime() > absoluteMaxMs) {
        log.warn("Customer absolute timeout exceeded", {
          loginAt: dbSession.loginAt.toISOString(),
          now: new Date(now).toISOString(),
          maxAgeMs: absoluteMaxMs,
          ageMs: now - dbSession.loginAt.getTime(),
        });
        await deleteCustomerSession(dbSession.id, cacheKey);
        return {};
      }

      // 2️⃣ Idle Timeout — no activity within configured days
      const idleMaxMs = env.CUSTOMER_SESSION_IDLE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;
      if (now - dbSession.lastActiveAt.getTime() > idleMaxMs) {
        log.warn("Customer idle timeout exceeded", {
          lastActiveAt: dbSession.lastActiveAt.toISOString(),
          now: new Date(now).toISOString(),
          idleMaxMs,
          idleMs: now - dbSession.lastActiveAt.getTime(),
        });
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
