import { toNestErrors } from "@hookform/resolvers";
import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import { z } from "zod";

/**
 * A custom Zod resolver for React Hook Form that uses the local Zod instance.
 * This resolves the issue where `@hookform/resolvers/zod` checks `instanceof ZodError`
 * using a different Zod bundle, causing unhandled promise rejections on validation.
 */
export function zodResolver<T extends z.ZodSchema>(schema: T): Resolver<z.infer<T> & FieldValues> {
  return async (values, _context, options) => {
    try {
      const data = await schema.parseAsync(values);
      return {
        values: data as z.infer<T> & FieldValues,
        errors: {},
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, { message: string; type: string }> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".");
          errors[path] = {
            message: issue.message,
            type: issue.code,
          };
        }
        return {
          values: {},
          errors: toNestErrors(errors as unknown as FieldErrors<z.infer<T> & FieldValues>, options),
        };
      }
      throw error;
    }
  };
}
