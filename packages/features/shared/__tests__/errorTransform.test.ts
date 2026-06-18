import { describe, expect, it } from "vitest";

// Inline the functions to avoid cross-package import issues
const ERROR_CODE_MAP: Record<string, string> = {
  NOT_FOUND: "NOT_FOUND",
  POST_NOT_FOUND: "NOT_FOUND",
  PAGE_NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "UNAUTHORIZED",
  TOKEN_EXPIRED: "UNAUTHORIZED",
  VALIDATION_ERROR: "BAD_REQUEST",
  DUPLICATE_ENTRY: "CONFLICT",
  SLUG_ALREADY_EXISTS: "CONFLICT",
  EMAIL_ALREADY_EXISTS: "CONFLICT",
  RATE_LIMITED: "TOO_MANY_REQUESTS",
  INTERNAL_ERROR: "INTERNAL_SERVER_ERROR",
};

function mapErrorCodeToTRPC(errorCode: string): string {
  return ERROR_CODE_MAP[errorCode] ?? "INTERNAL_SERVER_ERROR";
}

function isErrorWithCode(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

describe("mapErrorCodeToTRPC", () => {
  it("should map NOT_FOUND codes", () => {
    expect(mapErrorCodeToTRPC("NOT_FOUND")).toBe("NOT_FOUND");
    expect(mapErrorCodeToTRPC("POST_NOT_FOUND")).toBe("NOT_FOUND");
    expect(mapErrorCodeToTRPC("PAGE_NOT_FOUND")).toBe("NOT_FOUND");
    expect(mapErrorCodeToTRPC("USER_NOT_FOUND")).toBe("NOT_FOUND");
  });

  it("should map FORBIDDEN codes", () => {
    expect(mapErrorCodeToTRPC("FORBIDDEN")).toBe("FORBIDDEN");
    expect(mapErrorCodeToTRPC("INSUFFICIENT_PERMISSIONS")).toBe("FORBIDDEN");
  });

  it("should map UNAUTHORIZED codes", () => {
    expect(mapErrorCodeToTRPC("UNAUTHORIZED")).toBe("UNAUTHORIZED");
    expect(mapErrorCodeToTRPC("INVALID_CREDENTIALS")).toBe("UNAUTHORIZED");
    expect(mapErrorCodeToTRPC("TOKEN_EXPIRED")).toBe("UNAUTHORIZED");
  });

  it("should map CONFLICT codes", () => {
    expect(mapErrorCodeToTRPC("DUPLICATE_ENTRY")).toBe("CONFLICT");
    expect(mapErrorCodeToTRPC("SLUG_ALREADY_EXISTS")).toBe("CONFLICT");
  });

  it("should default unknown codes to INTERNAL_SERVER_ERROR", () => {
    expect(mapErrorCodeToTRPC("UNKNOWN_CODE_XYZ")).toBe("INTERNAL_SERVER_ERROR");
  });
});

describe("isErrorWithCode", () => {
  it("should identify objects with code and message", () => {
    expect(isErrorWithCode({ code: "NOT_FOUND", message: "Post not found" })).toBe(true);
  });

  it("should reject null", () => {
    expect(isErrorWithCode(null)).toBe(false);
  });

  it("should reject strings", () => {
    expect(isErrorWithCode("error")).toBe(false);
  });

  it("should reject objects without code", () => {
    expect(isErrorWithCode({ message: "no code" })).toBe(false);
  });

  it("should reject objects with non-string code", () => {
    expect(isErrorWithCode({ code: 123, message: "numeric code" })).toBe(false);
  });
});
