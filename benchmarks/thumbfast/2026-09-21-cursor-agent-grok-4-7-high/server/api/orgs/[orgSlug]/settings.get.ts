import { getPathParam } from "../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../_shared/session";

export default async function orgSettings(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);
  const result = await getRequiredOrgForSession(event, orgSlug);

  if (result.status !== 200) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  return Response.json({ org: result.org, role: result.role });
}
