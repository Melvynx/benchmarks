import {
  httpActionGeneric,
  httpRouter,
  type FunctionReference,
} from "convex/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth/config";

const http = httpRouter();
type StripeWebhookResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      message?: string;
      notified?: boolean;
    };
type ProcessStripeWebhookRef = FunctionReference<
  "action",
  "internal",
  { body: string; signature: string },
  StripeWebhookResult
>;
type SendAdminNotificationRef = FunctionReference<
  "action",
  "internal",
  {
    event: string;
    title: string;
    dedupeKey?: string;
    details?: {
      label: string;
      value?: string | number | boolean | null;
    }[];
  },
  { sent: boolean; reason?: string }
>;
const internalApi = internal as unknown as {
  billingNode: { processStripeWebhook: ProcessStripeWebhookRef };
  telegram: { sendAdminNotification: SendAdminNotificationRef };
};

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/health",
  method: "GET",
  handler: httpActionGeneric(async () => {
    return Response.json({ ok: true, service: "thumbfast-convex" });
  }),
});

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpActionGeneric(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return Response.json(
        { error: "Missing Stripe signature" },
        { status: 400 },
      );
    }

    let result: StripeWebhookResult;
    try {
      result = await ctx.runAction(
        internalApi.billingNode.processStripeWebhook,
        {
          body: await request.text(),
          signature,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
      await ctx.runAction(internalApi.telegram.sendAdminNotification, {
        event: "convex.server_error",
        title: "Convex HTTP route failed",
        dedupeKey: `convex-error:http-stripe-webhook:${hourBucket}:${message.slice(0, 80)}`,
        details: [
          { label: "Route", value: "POST /stripe/webhook" },
          { label: "Error", value: message },
        ],
      });
      return Response.json(
        {
          error: "Webhook processing failed",
          message: "Stripe can retry this event.",
        },
        { status: 500 },
      );
    }

    if (!result.ok) {
      if (result.status >= 500 && !result.notified) {
        const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
        await ctx.runAction(internalApi.telegram.sendAdminNotification, {
          event: "convex.server_error",
          title: "Convex Stripe webhook returned an error",
          dedupeKey: `convex-error:http-stripe-webhook-result:${hourBucket}:${result.error}`,
          details: [
            { label: "Route", value: "POST /stripe/webhook" },
            { label: "Status", value: result.status },
            { label: "Error", value: result.error },
            { label: "Message", value: result.message },
          ],
        });
      }
      return Response.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: result.status },
      );
    }

    return Response.json({ ok: true });
  }),
});

export default http;
