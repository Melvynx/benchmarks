import { api } from "@convex/_generated/api";
import { fetchAuthQueryForRequest } from "@/lib/auth-server";
import { getRequiredSession, type NitroRequestEvent } from "../_shared/session";

export default async function organizations(event: NitroRequestEvent) {
  const session = await getRequiredSession(event);

  if (!session) {
    return Response.json({ items: [] }, { status: 401 });
  }

  const result = await fetchAuthQueryForRequest(
    event.req,
    api.app.listUserOrganizations,
    {},
  );
  return Response.json(result);
}
