import { translate } from "@flash-ship/ecom-i18n";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./createContext";

export interface ZodErrorDetail {
  field: string;
  issue: string;
  message: string;
}

function translateInvalidString(
  issue: Record<string, unknown>,
  locale: string | null | undefined,
): string {
  const validation = issue.validation;
  if (validation === "email") {
    return translate("validation.isEmail", locale);
  }
  if (validation === "url") {
    return translate("validation.invalid_url", locale);
  }
  return translate("validation.invalid_format", locale);
}

function translateTooSmall(
  issue: Record<string, unknown>,
  locale: string | null | undefined,
): string {
  const minimum = issue.minimum as number;
  if (issue.type === "string") {
    const translated = translate("validation.minLength", locale);
    return translated.replace("{limit}", String(minimum));
  }
  const isVi = locale === "vi";
  return isVi
    ? `Giá trị phải lớn hơn hoặc bằng ${minimum}`
    : `Value must be greater than or equal to ${minimum}`;
}

function translateTooBig(
  issue: Record<string, unknown>,
  locale: string | null | undefined,
): string {
  const maximum = issue.maximum as number;
  if (issue.type === "string") {
    const translated = translate("validation.maxLength", locale);
    return translated.replace("{limit}", String(maximum));
  }
  const isVi = locale === "vi";
  return isVi
    ? `Giá trị phải nhỏ hơn hoặc bằng ${maximum}`
    : `Value must be less than or equal to ${maximum}`;
}

function translateInvalidType(
  issue: Record<string, unknown>,
  locale: string | null | undefined,
): string {
  const received = issue.received;
  if (received === "undefined" || received === "null") {
    return translate("validation.isNotEmpty", locale);
  }
  return translate("validation.invalid_type", locale);
}

function getFallbackTranslation(
  issue: ZodError["issues"][number],
  locale: string | null | undefined,
): string {
  const issueObj = issue as unknown as Record<string, unknown>;
  switch (issueObj.code) {
    case "invalid_string":
    case "invalid_format":
      return translateInvalidString(issueObj, locale);
    case "too_small":
      return translateTooSmall(issueObj, locale);
    case "too_big":
    case "too_large":
      return translateTooBig(issueObj, locale);
    case "invalid_type":
      return translateInvalidType(issueObj, locale);
    default:
      return issue.message;
  }
}

export function formatZodError(error: ZodError, locale: string | null | undefined) {
  const details: ZodErrorDetail[] = error.issues.map((issue) => {
    const field = issue.path.join(".");
    const issueKey = issue.message;

    // Check if the issueKey is a translation key.
    // Standard translation keys contain a namespace dot, e.g. "users.profile..."
    const isTranslationKey = issueKey.includes(".") && !issueKey.includes(" ");

    let translatedMessage: string;
    if (isTranslationKey) {
      translatedMessage = translate(issueKey, locale);
    } else {
      translatedMessage = getFallbackTranslation(issue, locale);
    }

    return {
      field,
      issue: issueKey,
      message: translatedMessage,
    };
  });

  const mainMessage = details.map((d) => d.message).join(", ");
  return {
    message: mainMessage,
    details,
  };
}

/**
 * Singleton tRPC instance — isolated to break circular dependencies.
 *
 * Middleware files import `middleware` from here instead of `trpc.ts`,
 * which prevents the "Cannot access 'middleware' before initialization"
 * ReferenceError caused by circular ESM evaluation order.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    const locale = ctx?.locale;
    const isZodError = error.cause instanceof ZodError;

    let translatedMessage = error.message;
    let zodErrorDetails = null;

    if (isZodError) {
      const formatted = formatZodError(error.cause, locale);
      translatedMessage = formatted.message;
      zodErrorDetails = formatted;
    } else {
      // It's a standard TRPCError/ErrorWithCode.
      // If the message is a translation key, translate it.
      // Otherwise, translate will fall back to returning it as-is.
      const meta = error.cause instanceof ErrorWithCode ? error.cause.meta : undefined;
      translatedMessage = translate(error.message, locale, meta as Record<string, unknown>);
    }

    return {
      ...shape,
      message: translatedMessage,
      data: {
        ...shape.data,
        zodError: zodErrorDetails,
      },
    };
  },
});

import { registerEventListeners } from "@ecom/features/events/listeners";

// Initialize domain event listeners for tRPC environment
registerEventListeners();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;
