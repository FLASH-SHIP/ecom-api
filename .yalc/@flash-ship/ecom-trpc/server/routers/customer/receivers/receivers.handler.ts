import { getCustomerReceiverService } from "@ecom/features/di/containers/CustomerReceiverService";
import {
  validatePostalCode,
  validateReceiverEmail,
  validateReceiverName,
  validateReceiverPhone,
  validateReceiverState,
} from "@flash-ship/ecom-lib";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listReceivers = authedProcedure.query(async ({ ctx }) => {
  return getCustomerReceiverService().listByCustomer(ctx.user.id);
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: receiver validation refinement
function validateReceiverInput(
  data: Partial<z.infer<typeof receiverInputSchemaObject>>,
  ctx: z.RefinementCtx,
) {
  if (data.name) {
    const nameVal = validateReceiverName(data.name);
    if (!nameVal.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: nameVal.message });
    }
  }
  if (data.phone) {
    const phoneVal = validateReceiverPhone(data.phone);
    if (!phoneVal.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: phoneVal.message });
    }
  }
  if (data.email) {
    const emailVal = validateReceiverEmail(data.email);
    if (!emailVal.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: emailVal.message });
    }
  }
  if (data.address1 && data.address1.length > 150) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["address1"],
      message: "Địa chỉ 1 không được vượt quá 150 ký tự",
    });
  }
  if (data.address2 && data.address2.length > 150) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["address2"],
      message: "Địa chỉ 2 không được vượt quá 150 ký tự",
    });
  }
  if (data.state && data.country) {
    const stateVal = validateReceiverState(data.country, data.state);
    if (!stateVal.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["state"], message: stateVal.message });
    }
  }
  if (data.zipCode && data.country && !validatePostalCode(data.country, data.zipCode)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["zipCode"],
      message: `Mã Postcode/Zipcode không đúng định dạng cho quốc gia ${data.country}`,
    });
  }
}

const receiverInputSchemaObject = z.object({
  label: z.string().nullish(),
  name: z.string().min(1).max(100),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  address1: z.string().min(1).max(150),
  address2: z.string().nullish(),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
  country: z.string().default("US"),
  isDefault: z.boolean().default(false),
});

const receiverInputSchema = receiverInputSchemaObject.superRefine(validateReceiverInput);

export const createReceiver = authedProcedure
  .input(receiverInputSchema)
  .mutation(async ({ ctx, input }) => {
    return getCustomerReceiverService().create(ctx.user.id, input);
  });

const updateReceiverInputSchema = receiverInputSchemaObject
  .partial()
  .superRefine(validateReceiverInput);

export const updateReceiver = authedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      data: updateReceiverInputSchema,
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
