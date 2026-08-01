import { describe, expect, it } from "vitest";
import { CustomerTransformer } from "../CustomerTransformer";

describe("CustomerTransformer", () => {
  const transformer = new CustomerTransformer();

  it("should transform full customer object correctly", () => {
    const input = {
      id: "cust-uuid-1",
      customerCode: "KH2026001",
      email: "customer@example.com",
      username: "customer1",
      name: "Nguyễn Văn A",
      phone: "0987654321",
      avatarUrl: "https://example.com/avatar.png",
      status: "ACTIVE",
      emailVerified: new Date("2026-01-01T00:00:00Z"),
      dob: new Date("1995-05-15T00:00:00Z"),
      gender: "male",
      description: "VIP customer",
      createdAt: new Date("2026-01-01T08:00:00Z"),
      updatedAt: new Date("2026-06-01T10:00:00Z"),
      group: {
        id: 1,
        name: "Gold Member",
        code: "GOLD",
      },
    };

    const result = transformer.transform(input);

    expect(result).toEqual({
      id: "cust-uuid-1",
      customerCode: "KH2026001",
      email: "customer@example.com",
      username: "customer1",
      name: "Nguyễn Văn A",
      phone: "0987654321",
      avatarUrl: "https://example.com/avatar.png",
      status: "ACTIVE",
      emailVerified: "2026-01-01T00:00:00.000Z",
      dob: "1995-05-15T00:00:00.000Z",
      gender: "male",
      description: "VIP customer",
      createdAt: "2026-01-01T08:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      group: {
        id: 1,
        name: "Gold Member",
        code: "GOLD",
      },
    });
  });

  it("should handle null and optional fields gracefully", () => {
    const input = {
      id: "cust-uuid-2",
      email: "cust2@example.com",
      username: "cust2",
    };

    const result = transformer.transform(input);

    expect(result.id).toBe("cust-uuid-2");
    expect(result.customerCode).toBeNull();
    expect(result.name).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.status).toBe("ACTIVE");
    expect(result.emailVerified).toBeNull();
    expect(result.dob).toBeNull();
    expect(result.gender).toBeNull();
    expect(result.description).toBeNull();
    expect(result.updatedAt).toBeNull();
    expect(result.group).toBeNull();
    expect(typeof result.createdAt).toBe("string");
  });

  it("should format string dates correctly", () => {
    const input = {
      id: "cust-uuid-3",
      email: "cust3@example.com",
      username: "cust3",
      emailVerified: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const result = transformer.transform(input);

    expect(result.emailVerified).toBe("2026-02-01T00:00:00.000Z");
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
