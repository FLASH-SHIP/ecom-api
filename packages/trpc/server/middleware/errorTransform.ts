import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/unstable-core-do-not-import";

/**
 * Maps ErrorWithCode error codes to tRPC error codes.
 *
 * Eliminates boilerplate try/catch blocks in tRPC routers by providing
 * a centralized mapping from business-layer ErrorWithCode to tRPC errors.
 *
 * Usage in tRPC middleware:
 *   import { mapErrorCodeToTRPC } from "@flash-ship/ecom-trpc/server/middleware/errorTransform";
 */

const ERROR_CODE_MAP: Record<string, TRPC_ERROR_CODE_KEY> = {
  NOT_FOUND: "NOT_FOUND",
  POST_NOT_FOUND: "NOT_FOUND",
  PAGE_NOT_FOUND: "NOT_FOUND",
  CATEGORY_NOT_FOUND: "NOT_FOUND",
  TAG_NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "NOT_FOUND",
  MEMBER_NOT_FOUND: "NOT_FOUND",
  COMMENT_NOT_FOUND: "NOT_FOUND",
  MEDIA_NOT_FOUND: "NOT_FOUND",
  REVISION_NOT_FOUND: "NOT_FOUND",
  TEMPLATE_NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "UNAUTHORIZED",
  TOKEN_EXPIRED: "UNAUTHORIZED",
  TOKEN_INVALID: "UNAUTHORIZED",
  TOKEN_REVOKED: "UNAUTHORIZED",
  REFRESH_TOKEN_INVALID: "UNAUTHORIZED",
  API_KEY_INVALID: "UNAUTHORIZED",
  API_KEY_EXPIRED: "UNAUTHORIZED",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  DUPLICATE_ENTRY: "CONFLICT",
  SLUG_ALREADY_EXISTS: "CONFLICT",
  EMAIL_ALREADY_EXISTS: "CONFLICT",
  USERNAME_ALREADY_EXISTS: "CONFLICT",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

export function mapErrorCodeToTRPC(errorCode: string): TRPC_ERROR_CODE_KEY {
  return ERROR_CODE_MAP[errorCode] ?? "INTERNAL_SERVER_ERROR";
}

/**
 * Checks if an error is an ErrorWithCode instance (duck-typing).
 */
export function isErrorWithCode(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}
