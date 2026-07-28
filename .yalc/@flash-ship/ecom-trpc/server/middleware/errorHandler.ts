import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { createLogger } from "@flash-ship/ecom-lib/logger";
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

function handleAndMapError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof ErrorWithCode || isErrorWithCode(error)) {
    const err = error as { code: string; message: string; statusCode?: number };
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      log.error("Server error in procedure", { code: err.code, message: err.message });
    }
    throw new TRPCError({
      code: err.statusCode ? mapStatusToTRPCCode(err.statusCode) : mapErrorCodeToTRPC(err.code),
      message: err.message,
      cause: error,
    });
  }

  log.error("Unexpected error in procedure", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}

/**
 * Error handler logic — factored out so trpc.ts can call it without circular deps.
 */
export async function handleTRPCError<T>(next: () => Promise<T>): Promise<T> {
  try {
    const result = await next();

    if (result && typeof result === "object" && "ok" in result && !result.ok && "error" in result) {
      const trpcError = (result as { error: TRPCError }).error;
      const cause = trpcError.cause;

      if (cause && (cause instanceof ErrorWithCode || isErrorWithCode(cause))) {
        handleAndMapError(cause);
      }
    }

    return result;
  } catch (error) {
    handleAndMapError(error);
  }
}
