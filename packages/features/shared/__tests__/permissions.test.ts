import { ALL_PERMISSIONS, Permissions } from "@ecom/lib/permissions";
import { describe, expect, it } from "vitest";

describe("Permissions", () => {
  it("should have ALL_PERMISSIONS entries for every Permissions constant", () => {
    const allPermNames = ALL_PERMISSIONS.map((p) => p.name);
    const constantValues = Object.values(Permissions);

    for (const val of constantValues) {
      expect(allPermNames).toContain(val);
    }
  });

  it("ALL_PERMISSIONS should have no duplicates", () => {
    const names = ALL_PERMISSIONS.map((p) => p.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("should have displayName and group for every permission", () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(perm.displayName).toBeTruthy();
      expect(perm.group).toBeTruthy();
    }
  });

  it("should have webhook permissions", () => {
    const webhookPerms = ALL_PERMISSIONS.filter((p) => p.group === "webhooks");
    expect(webhookPerms.length).toBe(4);
  });

  it("should have comment permissions", () => {
    const commentPerms = ALL_PERMISSIONS.filter((p) => p.group === "comments");
    expect(commentPerms.length).toBe(3);
  });

  it("should have contact permissions", () => {
    const contactPerms = ALL_PERMISSIONS.filter((p) => p.group === "contacts");
    expect(contactPerms.length).toBe(3);
  });
});
