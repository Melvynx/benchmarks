import { describe, expect, it } from "vitest";
import type { AuthPermission } from "../src/lib/auth/auth-permissions";
import { AuthPermissionSchema } from "../src/lib/auth/auth-permissions";

describe("AuthPermissionSchema", () => {
  it("should validate valid permission objects", () => {
    const validPermissions: AuthPermission = {
      project: ["create"],
    };

    const result = AuthPermissionSchema.safeParse(validPermissions);
    expect(result.success).toBe(true);
  });

  it("should refuse invalid permission objects", () => {
    const invalidPermissions: AuthPermission = {
      // @ts-expect-error invalid permissions
      project: ["create", "invalid"],
    };

    const result = AuthPermissionSchema.safeParse(invalidPermissions);
    expect(result.success).toBe(false);
  });
});
