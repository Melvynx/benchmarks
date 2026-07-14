import type { AuthRole } from "@/lib/auth/auth-permissions";
import { isInRoles } from "@/lib/organizations/is-in-roles";
import { describe, expect, it } from "vitest";

describe("isInRoles", () => {
  it("returns false if userRoles is undefined", () => {
    expect(isInRoles(undefined, ["admin"])).toBe(false);
  });

  it("returns true if user has owner role, regardless of rolesNeeded", () => {
    expect(isInRoles(["owner"], ["admin", "member"])).toBe(true);
    expect(isInRoles(["owner"], [])).toBe(true);
    expect(isInRoles(["owner"], undefined)).toBe(true);
  });

  it("returns true if rolesNeeded is undefined", () => {
    expect(isInRoles(["admin"], undefined)).toBe(true);
  });

  it("returns true if rolesNeeded is empty", () => {
    expect(isInRoles(["admin"], [])).toBe(true);
  });

  it("returns true if user has all required roles", () => {
    expect(isInRoles(["admin", "member"], ["admin"])).toBe(true);
    expect(isInRoles(["admin", "member"], ["admin", "member"])).toBe(true);
  });

  it("returns false if user doesn't have all required roles", () => {
    expect(isInRoles(["member"], ["admin"])).toBe(false);
    expect(isInRoles(["admin"], ["admin", "member"])).toBe(false);
  });

  it("handles case with multiple roles correctly", () => {
    const userRoles: AuthRole[] = ["admin", "member"];

    // All roles needed are in userRoles
    expect(isInRoles(userRoles, ["admin", "member"])).toBe(true);

    // Not all roles needed are in userRoles
    expect(isInRoles(userRoles, ["admin", "owner"])).toBe(false);
  });

  it("works with empty arrays", () => {
    expect(isInRoles([], [])).toBe(true);
    expect(isInRoles([], ["admin"])).toBe(false);
  });
});
