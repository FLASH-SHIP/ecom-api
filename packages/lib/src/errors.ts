import type { ErrorCodeType } from "./errorCodes";
import { ErrorCode } from "./errorCodes";

/**
 * Application error with a machine-readable code.
 * Used in services and repositories (NOT in tRPC routers or NestJS controllers).
 */
export class ErrorWithCode extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly meta?: Record<string, unknown>;

  constructor(
    code: ErrorCodeType,
    message: string,
    statusCode = 500,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ErrorWithCode";
    this.code = code;
    this.statusCode = statusCode;
    this.meta = meta;
  }

  /**
   * Factory methods for common error patterns.
   */
  static Factory = {
    NotFound: (message = "Resource not found") =>
      new ErrorWithCode(ErrorCode.NotFound, message, 404),

    Forbidden: (message = "Access denied") => new ErrorWithCode(ErrorCode.Forbidden, message, 403),

    BadRequest: (message = "Bad request") => new ErrorWithCode(ErrorCode.BadRequest, message, 400),

    InvalidCredentials: (message = "Invalid email or password") =>
      new ErrorWithCode(ErrorCode.InvalidCredentials, message, 401),

    Unauthorized: (message = "Unauthorized") =>
      new ErrorWithCode(ErrorCode.TokenInvalid, message, 401),

    Validation: (message = "Validation error") =>
      new ErrorWithCode(ErrorCode.ValidationError, message, 422),

    Conflict: (message = "Resource already exists") =>
      new ErrorWithCode(ErrorCode.Conflict, message, 409),

    Internal: (message = "Internal server error") =>
      new ErrorWithCode(ErrorCode.InternalError, message, 500),
  } as const;
}
