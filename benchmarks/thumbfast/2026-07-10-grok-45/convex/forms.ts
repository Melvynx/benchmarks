/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { authComponent } from "./auth/config";
import { sendMarkdownEmail } from "./email/sendMarkdownEmail";

const CONTACT_EMAIL =
  process.env.VITE_EMAIL_CONTACT ??
  process.env.NEXT_PUBLIC_EMAIL_CONTACT ??
  "contact@thumbfa.st";

const internalApi = internal as any;

async function getOptionalUser(ctx: any) {
  try {
    const user = await authComponent.getAuthUser(ctx as never);
    return {
      id: String(user._id),
      email: user.email,
      name: user.name,
    };
  } catch {
    return null;
  }
}

const sendEmail = sendMarkdownEmail;

export const addEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    await ctx.runMutation(internalApi.forms.upsertNewsletterSubscription, {
      email,
      source: "email-form",
    });

    return { ok: true };
  },
});

export const contactSupport = action({
  args: {
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    firstname: v.optional(v.string()),
    lastname: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const email = args.email.trim();
    const subject = args.subject.trim();
    const message = args.message.trim();
    if (!email) throw new Error("Email is required");
    if (!subject) throw new Error("Subject is required");
    if (!message) throw new Error("Message is required");

    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `Support needed from ${email} - ${subject}`,
      preview: `Support request from ${email}`,
      badgeLabel: "Support",
      badgeVariant: "dark",
      markdown: `
        # New support request

        **From:** ${email}

        **Subject:** ${subject}

        ${message}
      `,
      replyTo: email,
    });

    return { message: "Your message has been sent to support." };
  },
});

export const submitFeedback = action({
  args: {
    email: v.optional(v.string()),
    review: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    const email = user?.email ?? args.email?.trim() ?? "";
    const rating = Number(args.review ?? 0) || 0;
    const message = args.message.trim();
    if (!message) throw new Error("Message is required");

    await ctx.runMutation(internalApi.forms.createFeedback, {
      userId: user?.id,
      rating,
      message,
    });

    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `New feedback from ${email || "anonymous user"}`,
      preview: `New feedback from ${email || "anonymous user"}`,
      badgeLabel: "Feedback",
      badgeVariant: "dark",
      markdown: `
        # New product feedback

        **From:** ${email || "anonymous user"}

        **Review:** ${rating}

        ${message}
      `,
      replyTo: email || undefined,
    });

    return { message: "Your feedback has been sent to support." };
  },
});

export const upsertNewsletterSubscription = internalMutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("newsletterSubscriptions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        source: args.source,
        updatedAt: now,
      });
      return { id: String(existing._id) };
    }

    const id = await ctx.db.insert("newsletterSubscriptions", {
      email: args.email,
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id) };
  },
});

export const createFeedback = internalMutation({
  args: {
    userId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    rating: v.optional(v.number()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("feedbacks", {
      userId: args.userId,
      organizationId: args.organizationId,
      rating: args.rating,
      message: args.message,
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id) };
  },
});
