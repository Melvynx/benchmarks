import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";

export type NitroRequestEvent = {
  req: Request;
};

export async function getRequiredSession(event: NitroRequestEvent) {
  try {
    const profile = await fetchAuthQueryForRequest(
      event.req,
      api.app.getProfile,
      {},
    );
    return {
      user: profile.user,
    };
  } catch {
    return null;
  }
}

export async function getRequiredOrgForSession(
  event: NitroRequestEvent,
  orgSlug: string,
) {
  const session = await getRequiredSession(event);

  if (!session) {
    return { status: 401 as const, session: null, org: null };
  }

  try {
    const result = await fetchAuthQueryForRequest(
      event.req,
      api.app.orgSettings,
      { orgSlug },
    );
    return {
      status: 200 as const,
      session,
      role: result.role,
      org: result.org,
      features: result.features,
    };
  } catch {
    return { status: 404 as const, session, org: null };
  }
}
