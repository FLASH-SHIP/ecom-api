import { getCustomerSenderService } from "@ecom/features/di/containers/CustomerSenderService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listSenders = authedProcedure.query(async ({ ctx }) => {
  return getCustomerSenderService().listByCustomer(ctx.user.id);
});

const senderInputSchema = z.object({
  label: z.string().nullish(),
  name: z.string().min(1),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  address: z.string().min(1),
  city: z.string().min(1),
  ward: z.string().nullish(),
  zipCode: z.string().nullish(),
  country: z.string().default("VN"),
  isDefault: z.boolean().default(false),
});

export const createSender = authedProcedure
  .input(senderInputSchema)
  .mutation(async ({ ctx, input }) => {
    return getCustomerSenderService().create(ctx.user.id, input);
  });

export const updateSender = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      data: senderInputSchema.partial(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getCustomerSenderService().update(input.id, ctx.user.id, input.data);
  });

export const deleteSender = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getCustomerSenderService().delete(input.id, ctx.user.id);
  });

export const setDefaultSender = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getCustomerSenderService().setDefault(input.id, ctx.user.id);
  });
