import { describe, expect, it } from "vitest";
import { generateHmacSignature, verifyHmacSignature } from "../crypto";

describe("crypto helpers", () => {
  const secret = "whsec_test_secret_123456";
  const payload = { event: "order.created", orderCode: "EC123456" };

  it("should generate a valid hex HMAC SHA-256 signature", () => {
    const signature = generateHmacSignature(payload, secret);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe("string");
    expect(signature.length).toBe(64); // 256 bits = 64 hex characters
  });

  it("should verify valid HMAC signature", () => {
    const signature = generateHmacSignature(payload, secret);
    const isValid = verifyHmacSignature(payload, secret, signature);
    expect(isValid).toBe(true);
  });

  it("should verify signature prefixed with sha256=", () => {
    const signature = generateHmacSignature(payload, secret);
    const isValid = verifyHmacSignature(payload, secret, `sha256=${signature}`);
    expect(isValid).toBe(true);
  });

  it("should reject invalid HMAC signature", () => {
    const isValid = verifyHmacSignature(payload, secret, "invalid_signature_hex_1234567890abcdef");
    expect(isValid).toBe(false);
  });
});
