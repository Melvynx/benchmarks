import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { up } from "up-fetch";
import {
  buildAdminNotificationMessage,
  type AdminNotificationDetail,
} from "../src/lib/admin-notification-message";

type ClaimAdminNotificationRef = FunctionReference<
  "mutation",
  "internal",
  { dedupeKey: string; event: string; title: string },
  { shouldSend: boolean }
>;
type MarkAdminNotificationSentRef = FunctionReference<
  "mutation",
  "internal",
  { dedupeKey: string },
  null
>;
type MarkAdminNotificationFailedRef = FunctionReference<
  "mutation",
  "internal",
  { dedupeKey: string; error: string },
  null
>;

const internalApi = internal as unknown as {
  telegram: {
    claimAdminNotification: ClaimAdminNotificationRef;
    markAdminNotificationSent: MarkAdminNotificationSentRef;
    markAdminNotificationFailed: MarkAdminNotificationFailedRef;
  };
};
const upfetch = up(fetch);

function getEnvironmentLabel() {
  return (
    process.env.VERCEL_ENV ??
    process.env.CONVEX_DEPLOYMENT ??
    process.env.NODE_ENV ??
    "unknown"
  );
}

export function buildMessage(args: {
  title: string;
  event: string;
  details?: AdminNotificationDetail[];
  now?: Date;
}) {
  return buildAdminNotificationMessage({
    ...args,
    environment: getEnvironmentLabel(),
  });
}

export const claimAdminNotification = internalMutation({
  args: {
    dedupeKey: v.string(),
    event: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminNotificationDeliveries")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
    const now = Date.now();

    if (existing?.status === "sent") {
      return { shouldSend: false };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        attempts: existing.attempts + 1,
        status: "pending",
        updatedAt: now,
      });
      return { shouldSend: true };
    }

    await ctx.db.insert("adminNotificationDeliveries", {
      dedupeKey: args.dedupeKey,
      event: args.event,
      title: args.title,
      attempts: 1,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { shouldSend: true };
  },
});

export const markAdminNotificationSent = internalMutation({
  args: {
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminNotificationDeliveries")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
      error: undefined,
    });
  },
});

export const markAdminNotificationFailed = internalMutation({
  args: {
    dedupeKey: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminNotificationDeliveries")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const sendAdminNotification = internalAction({
  args: {
    event: v.string(),
    title: v.string(),
    dedupeKey: v.optional(v.string()),
    details: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.optional(
            v.union(v.string(), v.number(), v.boolean(), v.null()),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const token = process.env.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { sent: false, reason: "not_configured" };
    }

    if (args.dedupeKey) {
      const claim = await ctx.runMutation(
        internalApi.telegram.claimAdminNotification,
        {
          dedupeKey: args.dedupeKey,
          event: args.event,
          title: args.title,
        },
      );

      if (!claim.shouldSend) {
        return { sent: false, reason: "deduped" };
      }
    }

    try {
      const data = await upfetch<{
        ok: boolean;
        description?: string;
      }>(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        body: {
          chat_id: chatId,
          text: buildMessage(args),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        },
      });

      if (!data.ok) {
        throw new Error(data.description ?? "Telegram sendMessage failed");
      }

      if (args.dedupeKey) {
        await ctx.runMutation(internalApi.telegram.markAdminNotificationSent, {
          dedupeKey: args.dedupeKey,
        });
      }

      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (args.dedupeKey) {
        await ctx.runMutation(
          internalApi.telegram.markAdminNotificationFailed,
          {
            dedupeKey: args.dedupeKey,
            error: message,
          },
        );
      }
      return { sent: false, reason: "send_failed" };
    }
  },
});
