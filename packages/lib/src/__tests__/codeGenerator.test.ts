import { describe, expect, it } from "vitest";
import { generateCustomerCode, generateEntityCode, generateRandomString } from "../codeGenerator";

describe("Code Generator Helpers", () => {
  it("should generate random string of correct length", () => {
    const str = generateRandomString(8);
    expect(str).toHaveLength(8);
    expect(typeof str).toBe("string");
  });

  it("should only contain letters from the custom alphabet", () => {
    const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const str = generateRandomString(100);
    for (const char of str) {
      expect(ALPHABET).toContain(char);
    }
  });

  it("should generate formatted entity codes with prefix and date", () => {
    const code = generateEntityCode("EC");

    // Format: EC + YYMMDD + 8 characters = 16 characters
    expect(code).toHaveLength(16);
    expect(code.startsWith("EC")).toBe(true);

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateStr = `${yy}${mm}${dd}`;

    expect(code.slice(2, 8)).toBe(dateStr);
  });

  it("should not generate duplicate codes", () => {
    const codes = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      codes.add(generateEntityCode("EC"));
    }
    expect(codes.size).toBe(count);
  });

  it("should generate customer code with correct prefix and length", () => {
    const code = generateCustomerCode("KH", 6);
    expect(code).toHaveLength(8); // "KH" (2) + 6 chars = 8
    expect(code.startsWith("KH")).toBe(true);

    const defaultCode = generateCustomerCode();
    expect(defaultCode).toHaveLength(8);
    expect(defaultCode.startsWith("KH")).toBe(true);
  });
});
