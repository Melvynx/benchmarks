import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { getPathParam } from "../../../../_shared/params";
import { getRequiredSession, type NitroRequestEvent } from "../../../../_shared/session";

export default async function acceptInvitation(event: NitroRequestEvent) {
  const session = await getRequiredSession(event);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitationId = getPathParam(event.req, 3);
  return Response.json(
    await fetchAuthMutationForRequest(event.req, api.app.acceptInvitation, { invitationId }),
  );
}
