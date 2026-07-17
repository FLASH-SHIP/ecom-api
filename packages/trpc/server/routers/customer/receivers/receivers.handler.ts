import { getCustomerReceiverService } from "@ecom/features/di/containers/CustomerReceiverService";
import { authedProcedure } from "@ecom/trpc/server/trpc";
import { z } from "zod";

export const listReceivers = authedProcedure.query(async ({ ctx }) => {
  return getCustomerReceiverService().listByCustomer(ctx.user.id);
});

const receiverInputSchema = z.object({
  label: z.string().nullish(),
  name: z.string().min(1),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  address1: z.string().min(1),
  address2: z.string().nullish(),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().default("US"),
  isDefault: z.boolean().default(false),
});

export const createReceiver = authedProcedure
  .input(receiverInputSchema)
  .mutation(async ({ ctx, input }) => {
    return getCustomerReceiverService().create(ctx.user.id, input);
  });

export const updateReceiver = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      data: receiverInputSchema.partial(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getCustomerReceiverService().update(input.id, ctx.user.id, input.data);
  });

export const deleteReceiver = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getCustomerReceiverService().delete(input.id, ctx.user.id);
  });

export const setDefaultReceiver = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getCustomerReceiverService().setDefault(input.id, ctx.user.id);
  });
