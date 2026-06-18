import {
  getMemberAuthService,
  getMemberTokenService,
} from "@ecom/features/di/containers/MemberService";
import { rateLimiters } from "@ecom/trpc/server/middleware/rateLimit";
import { publicProcedure } from "@ecom/trpc/server/trpc";
import { z } from "zod";

export const register = publicProcedure
  .use(rateLimiters.register)
  .input(
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(100),
      name: z.string().min(1).max(100).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const authService = getMemberAuthService();
    const tokenService = getMemberTokenService();

    const member = await authService.register(input);
    const tokens = tokenService.generateTokens(member);

    return { member, ...tokens };
  });

export const login = publicProcedure
  .use(rateLimiters.auth)
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const authService = getMemberAuthService();
    const tokenService = getMemberTokenService();

    const member = await authService.login(input.email, input.password);
    const tokens = tokenService.generateTokens(member);

    return { member, ...tokens };
  });

export const refreshToken = publicProcedure
  .use(rateLimiters.auth)
  .input(z.object({ refreshToken: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const tokenService = getMemberTokenService();

    const payload = tokenService.verifyRefreshToken(input.refreshToken);
    const tokens = tokenService.generateTokens({ id: payload.sub, email: payload.email });

    return tokens;
  });

export const me = publicProcedure
  .input(z.object({ accessToken: z.string().min(1) }))
  .query(async ({ input }) => {
    const tokenService = getMemberTokenService();
    const { getMemberRepository } = await import("@ecom/features/di/containers/MemberService");

    const payload = tokenService.verifyAccessToken(input.accessToken);
    const member = await getMemberRepository().findById(payload.sub);

    return member;
  });

export const updateProfile = publicProcedure
  .input(
    z.object({
      accessToken: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      phone: z.string().max(20).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const tokenService = getMemberTokenService();
    const { getMemberRepository } = await import("@ecom/features/di/containers/MemberService");

    const payload = tokenService.verifyAccessToken(input.accessToken);
    const repo = getMemberRepository();
    return repo.update(payload.sub, {
      name: input.name,
      phone: input.phone,
    });
  });
