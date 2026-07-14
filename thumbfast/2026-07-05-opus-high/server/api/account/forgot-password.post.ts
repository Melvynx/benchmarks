import { handler } from "@/lib/auth-server";
import type { NitroRequestEvent } from "../../_shared/session";

export default async function forgotPassword(event: NitroRequestEvent) {
  const body = (await event.req.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const url = new URL(event.req.url);
  url.pathname = "/api/auth/forget-password/email-otp";
  const headers = new Headers(event.req.headers);
  headers.delete("content-length");

  return handler(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
    }),
  );
}
