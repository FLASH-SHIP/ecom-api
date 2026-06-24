import { describe, expect, it } from "vitest";
import { UserTransformer } from "../UserTransformer";

describe("UserTransformer", () => {
  const transformer = new UserTransformer();

  it("should transform basic user details correctly", () => {
    const input = {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      username: "testuser",
      status: "ACTIVE",
      locale: "en",
      avatarUrl: "http://example.com/avatar.png",
      createdAt: new Date("2026-06-24T00:00:00Z"),
    };

    const result = transformer.transform(input);

    expect(result).toEqual({
      id: 1,
      email: "test@example.com",
      name: "Test User",
      username: "testuser",
      status: "ACTIVE",
      locale: "en",
      avatarUrl: "http://example.com/avatar.png",
      createdAt: "2026-06-24T00:00:00.000Z",
      roles: [],
    });
  });

  it("should map user roles correctly", () => {
    const input = {
      id: 2,
      email: "admin@example.com",
      roles: [
        {
          role: {
            id: "role-1",
            name: "admin",
            displayName: "Administrator",
          },
        },
      ],
    };

    const result = transformer.transform(input);

    expect(result.roles).toEqual([
      {
        role: {
          id: "role-1",
          name: "admin",
          displayName: "Administrator",
        },
      },
    ]);
  });

  it("should handle empty or null optional values", () => {
    const input = {
      id: 3,
    };

    const result = transformer.transform(input);

    expect(result.email).toBe("");
    expect(result.name).toBeNull();
    expect(result.username).toBeNull();
    expect(result.status).toBe("ACTIVE");
    expect(result.locale).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.roles).toEqual([]);
    expect(typeof result.createdAt).toBe("string");
  });
});
