import { describe, expect, it } from "vitest";
import { getSecurityHeaders } from "../headers";

describe("getSecurityHeaders", () => {
  it("should include X-Content-Type-Options", () => {
    const headers = getSecurityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("should include X-Frame-Options", () => {
    const headers = getSecurityHeaders();
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("should include X-XSS-Protection", () => {
    const headers = getSecurityHeaders();
    expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
  });

  it("should include Strict-Transport-Security", () => {
    const headers = getSecurityHeaders();
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
  });

  it("should include Referrer-Policy", () => {
    const headers = getSecurityHeaders();
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("should include Permissions-Policy", () => {
    const headers = getSecurityHeaders();
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
  });

  it("should include Content-Security-Policy", () => {
    const headers = getSecurityHeaders();
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("should block scripts from external sources by default", () => {
    const headers = getSecurityHeaders();
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self'");
  });
});
