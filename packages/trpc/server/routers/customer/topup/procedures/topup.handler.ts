import { getTopupTransactionService } from "@ecom/features/di/containers/TopupService";
import { z } from "zod";
import { authedProcedure } from "../../../../trpc";

export const getWalletSummary = authedProcedure.query(async ({ ctx }) => {
  return getTopupTransactionService().getWalletSummary(ctx.user.id);
});

export const getPaymentMethods = authedProcedure.query(async ({ ctx }) => {
  return getTopupTransactionService().getPaymentMethods(ctx.user.id);
});

export const getLatestExchangeRate = authedProcedure.query(async () => {
  return getTopupTransactionService().getLatestExchangeRate();
});

export const getTopupHistory = authedProcedure
  .input(
    z
      .object({
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().optional(),
        search: z.string().optional(),
        paymentMethodId: z.number().int().positive().optional(),
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    return getTopupTransactionService().getTopupHistory({
      customerId: ctx.user.id,
      page: input?.page,
      pageSize: input?.pageSize,
      search: input?.search,
      paymentMethodId: input?.paymentMethodId,
      status: input?.status,
      dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
    });
  });

export const createTopupRequest = authedProcedure
  .input(
    z.object({
      paymentMethodId: z.number().int().positive(),
      wireAmount: z.number().positive(),
      description: z.string().optional(),
      wireDate: z.string().optional(),
      wireImages: z.array(z.string()).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().createTopupRequest({
      customerId: ctx.user.id,
      paymentMethodId: input.paymentMethodId,
      wireAmount: input.wireAmount,
      description: input.description,
      wireDate: input.wireDate ? new Date(input.wireDate) : undefined,
      wireImages: input.wireImages,
    });
  });

export const updateTopupRequest = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      data: z.object({
        paymentMethodId: z.number().int().positive().optional(),
        wireAmount: z.number().positive().optional(),
        description: z.string().optional(),
        wireDate: z.string().optional(),
        wireImages: z.array(z.string()).optional(),
      }),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().updateTopupRequest(input.id, ctx.user.id, {
      ...input.data,
      wireDate: input.data.wireDate ? new Date(input.data.wireDate) : undefined,
    });
  });

export const cancelTopupRequest = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getTopupTransactionService().cancelTopupRequest(input.id, ctx.user.id);
  });
