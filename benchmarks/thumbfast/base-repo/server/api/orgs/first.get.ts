import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { getRequiredSession, type NitroRequestEvent } from "../../_shared/session";

export default async function firstOrg(event: NitroRequestEvent) {
  const session = await getRequiredSession(event);

  if (!session) {
    return Response.json({ redirectTo: "/auth/signin" }, { status: 401 });
  }

  const result = await fetchAuthMutationForRequest(event.req, api.app.firstOrg, {});
  return Response.json(result);
}
