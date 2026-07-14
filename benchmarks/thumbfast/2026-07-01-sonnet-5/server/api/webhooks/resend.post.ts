import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

const ResendWebhookSchema = z.object({
  type: z.string(),
  created_at: z.string().optional(),
  data: z.unknown(),
});

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyWebhookSecret(request: Request) {
  const expected = process.env.RESEND_WEBHOOK_SECRET;
  if (!expected) {
    return {
      ok: false,
      status: 501,
      error: "Resend webhook is not configured",
    };
  }

  const provided =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("resend-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || !safeEqual(provided, expected)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}

export default async function resendWebhook(event: { req: Request }) {
  const auth = verifyWebhookSecret(event.req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await event.req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ResendWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  switch (parsed.data.type) {
    case "email.complained":
      logger.warn("Email complained", parsed.data.data);
      break;
    case "email.bounced":
      logger.warn("Email bounced", parsed.data.data);
      break;
    default:
      logger.info("Unhandled Resend webhook", { type: parsed.data.type });
      break;
  }

  return Response.json({ ok: true });
}
