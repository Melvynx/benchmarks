import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { getPathParam } from "../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../_shared/session";

export default async function inviteOrgMember(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const result = await getRequiredOrgForSession(event, orgSlug);

  if (result.status !== 200) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  const body = (await event.req.json()) as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role ?? "member";

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const { invitation } = await fetchAuthMutationForRequest(
    event.req,
    api.app.inviteMember,
    {
      orgSlug,
      email,
      role,
    },
  );

  return Response.json({ invitation });
}
