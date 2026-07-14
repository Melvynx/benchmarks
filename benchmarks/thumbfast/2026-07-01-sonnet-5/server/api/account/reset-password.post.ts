import { handler } from "@/lib/auth-server";
import type { NitroRequestEvent } from "../../_shared/session";

export default async function resetPassword(event: NitroRequestEvent) {
  const body = (await event.req.json()) as {
    otp?: string;
    email?: string;
    newPassword?: string;
  };

  if (!body.email || !body.otp || !body.newPassword) {
    return Response.json({ error: "Missing reset data" }, { status: 400 });
  }

  const url = new URL(event.req.url);
  url.pathname = "/api/auth/email-otp/reset-password";
  const headers = new Headers(event.req.headers);
  headers.delete("content-length");

  return handler(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: body.email,
        otp: body.otp,
        password: body.newPassword,
      }),
    }),
  );
}
