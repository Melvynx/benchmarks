import { unauthorized } from "@/compat/navigation";
import type { AuthPermission, AuthRole } from "../auth/auth-permissions";
import { getPlanLimits } from "../auth/stripe/auth-plans";
import { getSession } from "../auth/auth-user";

type OrgParams = {
  roles?: AuthRole[];
  permissions?: AuthPermission;
  orgSlugOrId?: string;
};

type OrgApiKeys = {
  openaiApiKey?: string;
  geminiApiKey?: string;
};

export const getCurrentOrg = async (params?: OrgParams) => {
  const session = await getSession();
  if (!session?.user) return null;

  const slug = params?.orgSlugOrId ?? "default";
  return {
    id: slug,
    name: slug,
    slug,
    logo: null,
    metadata: null,
    createdAt: new Date(),
    stripeCustomerId: null,
    members: [],
    user: session.user,
    email: session.user.email,
    memberRoles: ["owner"] as AuthRole[],
    subscription: null,
    limits: getPlanLimits(),
  };
};

export type CurrentOrgPayload = NonNullable<
  Awaited<ReturnType<typeof getCurrentOrg>>
>;

export const getRequiredCurrentOrg = async (params?: OrgParams) => {
  const result = await getCurrentOrg(params);

  if (!result) {
    unauthorized();
  }

  return result;
};

export async function logCustomApiKeyUsage(
  _orgId?: string,
  _provider?: string,
  _model?: string,
) {
  return undefined;
}

export const getOrgApiKeys = async (
  _orgId?: string,
): Promise<OrgApiKeys> => ({});
