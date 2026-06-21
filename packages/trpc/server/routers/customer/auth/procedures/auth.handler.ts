import {
  getCustomerAuthService,
  getCustomerTokenService,
} from "@ecom/features/di/containers/CustomerService";
import { rateLimiters } from "@ecom/trpc/server/middleware/rateLimit";
import { publicProcedure } from "@ecom/trpc/server/trpc";
import { z } from "zod";

export const register = publicProcedure
  .use(rateLimiters.register)
  .input(
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(100),
      username: z
        .string()
        .regex(/^[a-z0-9_.]{3,30}$/)
        .optional(),
      name: z.string().min(1).max(200).optional(),
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

    const payload = tokenService.verifyRefreshToken(input.refreshToken);
    const tokens = tokenService.generateTokens({ id: payload.sub, email: payload.email });

    return tokens;
  });

export const me = publicProcedure
  .input(z.object({ accessToken: z.string().min(1) }))
  .query(async ({ input }) => {
    const tokenService = getCustomerTokenService();
    const { getCustomerRepository } = await import("@ecom/features/di/containers/CustomerService");

    const payload = tokenService.verifyAccessToken(input.accessToken);
    const customer = await getCustomerRepository().findById(payload.sub);

    return customer;
  });

export const updateProfile = publicProcedure
  .input(
    z.object({
      accessToken: z.string().min(1),
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
  .mutation(async ({ input }) => {
    const tokenService = getCustomerTokenService();
    const { getCustomerService } = await import("@ecom/features/di/containers/CustomerService");

    const payload = tokenService.verifyAccessToken(input.accessToken);
    const { accessToken: _, ...data } = input;
    const service = getCustomerService();
    return service.updateCustomer(payload.sub, data);
  });

export const verifyEmail = publicProcedure
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
  .input(
    z.object({
      accessToken: z.string().min(1),
      oldPassword: z.string().min(1),
      newPassword: z.string().min(8).max(100),
    }),
  )
  .mutation(async ({ input }) => {
    const tokenService = getCustomerTokenService();
    const authService = getCustomerAuthService();

    const payload = tokenService.verifyAccessToken(input.accessToken);
    await authService.changePassword(payload.sub, input.oldPassword, input.newPassword);
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
