import { handler } from "@/lib/auth-server";

export default async function authHandler(event: { req: Request }) {
  return handler(event.req);
}
