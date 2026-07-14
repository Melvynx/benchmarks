import type { AuthRole } from "../auth/auth-permissions";

/**
 *
 * @param userRoles User's roles
 * @param rolesNeeded Roles to check
 * @returns a boolean indicating if the user has at least one role in rolesB
 */
export const isInRoles = (userRoles?: AuthRole[], rolesNeeded?: AuthRole[]) => {
  if (!userRoles) return false;

  // Owner can access to everything
  if (userRoles.includes("owner")) return true;

  if (!rolesNeeded) return true;
  return rolesNeeded.every((role) => userRoles.includes(role));
};
