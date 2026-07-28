import {
  getCustomerAuthService,
  getCustomerTokenService,
} from "@ecom/features/di/containers/CustomerService";
import { rateLimiters } from "@flash-ship/ecom-trpc/server/middleware/rateLimit";
import { publicProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const sendVerificationCode = publicProcedure
  .use(rateLimiters.auth)
  .input(
    z.object({
      email: z.string().email().max(255),
    }),
  )
  .mutation(async ({ input }) => {
    const authService = getCustomerAuthService();
    await authService.sendVerificationCode(input.email);
    return { success: true };
  });

export const register = publicProcedure
  .use(rateLimiters.register)
  .input(
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(100),
      code: z.string().length(6),
    }),
  )
  .mutation(async ({ input }) => {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    const customer = await authService.register(input);
    const tokens = tokenService.generateTokens(customer);

    return { customer, ...tokens };
  });

export const login = publicProcedure
  .use(rateLimiters.auth)
  .input(
    z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const authService = getCustomerAuthService();
    const tokenService = getCustomerTokenService();

    const customer = await authService.login(input.identifier, input.password);
    const tokens = tokenService.generateTokens(customer);

    return { customer, ...tokens };
  });

export const refreshToken = publicProcedure
  .use(rateLimiters.auth)
  .input(z.object({ refreshToken: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const tokenService = getCustomerTokenService();

    const payload = await tokenService.verifyRefreshToken(input.refreshToken);

    const { getCustomerRepository } = await import("@ecom/features/di/containers/CustomerService");
    const customer = await getCustomerRepository().findById(payload.sub);
    if (customer?.status !== "ACTIVE") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Account is not active" });
    }

    const tokens = tokenService.generateTokens({ id: payload.sub, email: payload.email });

    return tokens;
  });

export const me = publicProcedure
  .input(z.object({ accessToken: z.string().optional() }).optional())
  .query(async ({ input, ctx }) => {
    const { getCustomerRepository } = await import("@ecom/features/di/containers/CustomerService");

    let customerId: string | null = null;
    if (ctx.user?.id) {
      customerId = ctx.user.id;
    } else if (input?.accessToken) {
      const tokenService = getCustomerTokenService();
      const payload = await tokenService.verifyAccessToken(input.accessToken);
      customerId = payload.sub;
    }

    if (!customerId) {
      return null;
    }

    const customer = await getCustomerRepository().findById(customerId);
    if (customer?.status !== "ACTIVE") {
      return null;
    }
    return customer;
  });

export const updateProfile = publicProcedure
  .use(rateLimiters.mutation)
  .input(
    z.object({
      accessToken: z.string().optional(),
      username: z
        .string()
        .regex(/^[a-z0-9_.]{3,30}$/)
        .optional(),
      name: z.string().min(1).max(200).optional(),
      phone: z.string().max(20).optional(),
      dob: z
        .string()
        .nullable()
        .optional()
        .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
      gender: z.enum(["male", "female", "other"]).nullable().optional(),
      description: z.string().max(1000).nullable().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    let customerId: string | null = null;
    if (ctx.user?.id) {
      customerId = ctx.user.id;
    } else if (input.accessToken) {
      const tokenService = getCustomerTokenService();
      const payload = await tokenService.verifyAccessToken(input.accessToken);
      customerId = payload.sub;
    }

    if (!customerId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const { getCustomerRepository, getCustomerService } = await import(
      "@ecom/features/di/containers/CustomerService"
    );
    const customer = await getCustomerRepository().findById(customerId);
    if (customer?.status !== "ACTIVE") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Account is not active" });
    }

    const { accessToken: _, ...data } = input;
    const service = getCustomerService();
    return service.updateCustomer(customerId, data);
  });

export const verifyEmail = publicProcedure
  .use(rateLimiters.auth)
  .input(z.object({ token: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const authService = getCustomerAuthService();
    return authService.verifyEmailByToken(input.token);
  });

export const forgotPassword = publicProcedure
  .use(rateLimiters.auth)
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const authService = getCustomerAuthService();
    await authService.forgotPassword(input.email);
    return { message: "If this email exists, we have sent a password reset link." };
  });

export const resetPassword = publicProcedure
  .use(rateLimiters.auth)
  .input(
    z.object({
      token: z.string().min(1),
      password: z.string().min(8).max(100),
    }),
  )
  .mutation(async ({ input }) => {
    const authService = getCustomerAuthService();
    return authService.resetPassword(input.token, input.password);
  });

export const changePassword = publicProcedure
  .use(rateLimiters.auth)
  .input(
    z.object({
      accessToken: z.string().optional(),
      oldPassword: z.string().min(1),
      newPassword: z.string().min(8).max(100),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    let customerId: string | null = null;
    if (ctx.user?.id) {
      customerId = ctx.user.id;
    } else if (input.accessToken) {
      const tokenService = getCustomerTokenService();
      const payload = await tokenService.verifyAccessToken(input.accessToken);
      customerId = payload.sub;
    }

    if (!customerId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    const authService = getCustomerAuthService();
    await authService.changePassword(
      customerId,
      input.oldPassword,
      input.newPassword,
      ctx.sessionToken || undefined,
    );
    return { success: true };
  });

export const checkUsername = publicProcedure
  .input(z.object({ username: z.string().min(3).max(30) }))
  .query(async ({ input }) => {
    const { getCustomerService } = await import("@ecom/features/di/containers/CustomerService");
    const service = getCustomerService();
    const available = await service.checkUsernameAvailability(input.username);
    return { available };
  });

export const logout = publicProcedure
  .use(rateLimiters.auth)
  .input(z.object({ refreshToken: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const tokenService = getCustomerTokenService();
    try {
      const payload = await tokenService.verifyRefreshToken(input.refreshToken);
      // Blacklist token for up to 30 days
      const secondsIn30Days = 30 * 24 * 60 * 60;
      if (payload.jti) {
        await tokenService.blacklistToken(payload.jti, secondsIn30Days);
      }
    } catch {
      // Ignore if expired
    }
    return { success: true };
  });
