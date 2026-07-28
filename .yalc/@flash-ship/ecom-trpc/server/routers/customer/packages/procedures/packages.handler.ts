import { getCustomerPackageService } from "@ecom/features/di/containers/CustomerPackageService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listPackages = authedProcedure.query(async ({ ctx }) => {
  return getCustomerPackageService().listByCustomer(ctx.user.id);
});

const packageInputSchema = z.object({
  label: z.string().nullish(),
  packageName: z.string().min(1),
  packingTypeId: z.number().int().positive(),
  length: z.number().positive().nullish(),
  width: z.number().positive().nullish(),
  height: z.number().positive().nullish(),
  weight: z.number().positive(),
  isDefault: z.boolean().default(false),
});

export const createPackage = authedProcedure
  .input(packageInputSchema)
  .mutation(async ({ ctx, input }) => {
    return getCustomerPackageService().create(ctx.user.id, input);
  });

export const updatePackage = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      data: packageInputSchema.partial(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getCustomerPackageService().update(input.id, ctx.user.id, input.data);
  });

export const deletePackage = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getCustomerPackageService().delete(input.id, ctx.user.id);
  });

export const setDefaultPackage = authedProcedure
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    return getCustomerPackageService().setDefault(input.id, ctx.user.id);
  });
