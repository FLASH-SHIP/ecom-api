import { describe, expect, it } from "vitest";
import {
  signQueueDashboardSession,
  signQueueDashboardToken,
  verifyQueueDashboardToken,
} from "../jwt";

describe("Queue Dashboard JWT Helpers", () => {
  it("should sign and verify a short-lived SSO token", () => {
    const payload = { userId: "123", email: "admin@example.com" };
    const token = signQueueDashboardToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyQueueDashboardToken(token);
    expect(decoded.userId).toBe("123");
    expect(decoded.email).toBe("admin@example.com");
    expect(decoded.type).toBe("queue-dashboard-sso");
    expect(decoded.jti).toBeDefined();
    expect(typeof decoded.jti).toBe("string");
  });

  it("should sign and verify a session token", () => {
    const payload = { userId: "123", email: "admin@example.com" };
    const token = signQueueDashboardSession(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyQueueDashboardToken(token);
    expect(decoded.userId).toBe("123");
    expect(decoded.email).toBe("admin@example.com");
    expect(decoded.type).toBe("queue-dashboard-session");
  });

  it("should fail validation for malformed token", () => {
    expect(() => verifyQueueDashboardToken("invalid-token")).toThrow();
  });
});
