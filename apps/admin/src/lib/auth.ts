import { PrismaAdapter } from "@auth/prisma-adapter";
import { getAuthService } from "@ecom/features/di/containers/AuthService";
import { prisma } from "@ecom/prisma";
import type { User as AppUser } from "@ecom/shared/@auth/user";
import type { NextAuthResult } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const nextAuth: NextAuthResult = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = String(token.id);

        // Populate session.db for the app's useUser hook
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.id) },
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
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
