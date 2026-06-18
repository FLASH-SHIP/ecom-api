import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";
import { TRPCError } from "@trpc/server";
import { isErrorWithCode, mapErrorCodeToTRPC } from "./errorTransform";

const log = createLogger("tRPC:ErrorHandler");

/**
 * Maps ErrorWithCode HTTP status codes to tRPC error codes.
 */
function mapStatusToTRPCCode(statusCode: number): TRPCError["code"] {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "TOO_MANY_REQUESTS";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

/**
 * Error handler logic — factored out so trpc.ts can call it without circular deps.
 */
export async function handleTRPCError<T>(next: () => Promise<T>): Promise<T> {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ErrorWithCode) {
      if (error.statusCode >= 500) {
        log.error("Server error in procedure", { code: error.code, message: error.message });
      }
      throw new TRPCError({
        code: mapStatusToTRPCCode(error.statusCode),
        message: error.message,
        cause: error,
      });
    }

    if (error instanceof TRPCError) {
      throw error;
    }

    if (isErrorWithCode(error)) {
      throw new TRPCError({
        code: mapErrorCodeToTRPC(error.code),
        message: error.message,
      });
    }

    log.error("Unexpected error in procedure", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
