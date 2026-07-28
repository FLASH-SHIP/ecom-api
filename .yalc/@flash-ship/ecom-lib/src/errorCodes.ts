/**
 * Standardized error codes for the Ecom.
 * Used with ErrorWithCode in services and repositories.
 */
export const ErrorCode = {
  // Auth
  InvalidCredentials: "INVALID_CREDENTIALS",
  EmailAlreadyExists: "EMAIL_ALREADY_EXISTS",
  UsernameAlreadyExists: "USERNAME_ALREADY_EXISTS",
  TokenExpired: "TOKEN_EXPIRED",
  TokenInvalid: "TOKEN_INVALID",
  TokenRevoked: "TOKEN_REVOKED",
  RefreshTokenInvalid: "REFRESH_TOKEN_INVALID",
  ApiKeyInvalid: "API_KEY_INVALID",
  ApiKeyExpired: "API_KEY_EXPIRED",
  VerificationCodeInvalid: "VERIFICATION_CODE_INVALID",
  VerificationCodeExpired: "VERIFICATION_CODE_EXPIRED",
  VerificationCodeLocked: "VERIFICATION_CODE_LOCKED",
  VerificationCodeRateLimited: "VERIFICATION_CODE_RATE_LIMITED",
  VerificationCodeAttempts: "VERIFICATION_CODE_ATTEMPTS",

  // Authorization
  Forbidden: "FORBIDDEN",
  InsufficientPermissions: "INSUFFICIENT_PERMISSIONS",

  // User
  UserNotFound: "USER_NOT_FOUND",

  // Blog
  PostNotFound: "POST_NOT_FOUND",
  CategoryNotFound: "CATEGORY_NOT_FOUND",
  TagNotFound: "TAG_NOT_FOUND",
  SlugAlreadyExists: "SLUG_ALREADY_EXISTS",

  // Shipping Rates / Rate Cards
  RateCardNotFound: "RATE_CARD_NOT_FOUND",
  RateCardConflict: "RATE_CARD_CONFLICT",
  RateCardValidationError: "RATE_CARD_VALIDATION_ERROR",

  // Generic
  NotFound: "NOT_FOUND",
  BadRequest: "BAD_REQUEST",
  Conflict: "CONFLICT",
  InternalError: "INTERNAL_ERROR",
  ValidationError: "VALIDATION_ERROR",

  // Customer Group
  CustomerGroupNotFound: "CUSTOMER_GROUP_NOT_FOUND",
  CustomerGroupConflict: "CUSTOMER_GROUP_CONFLICT",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
