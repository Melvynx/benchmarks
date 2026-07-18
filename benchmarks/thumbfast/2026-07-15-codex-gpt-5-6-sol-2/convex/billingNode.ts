"use node";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-condition */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { components, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { authComponent } from "./auth/config";
import { v } from "convex/values";
import Stripe from "stripe";
import { encryptApiKey } from "../src/lib/encryption";
import { upfetch } from "../src/lib/up-fetch";
import { getSubscriptionRenewalGrant } from "./billingRenewal";
import { renderMarkdownEmail } from "./email/markdownEmail";

const internalApi = internal as any;
const STRIPE_PLAN_NAMES = new Set(["free", "pro", "ultra", "poweruser"]);
const TRIAL_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
const customProviderValidator = v.union(
  v.literal("openai"),
  v.literal("gemini"),
  v.literal("apiyi"),
);
type CustomProvider = "openai" | "gemini" | "apiyi";

async function requireUser(ctx: any) {
  const user = await authComponent.getAuthUser(ctx as never);
  return { id: String(user._id), role: (user as { role?: string }).role };
}

function requireBillingManager(member: { role?: string }) {
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Only organization admins can manage API keys");
  }
}

function requireProductAdmin(user: { role?: string }) {
  if (user.role !== "admin") {
    throw new Error("Only product admins can manage APIYI keys");
  }
}

function getProviderLabel(provider: CustomProvider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  return "APIYI";
}

function requireStripe() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error("Stripe is not configured");
  return new Stripe(stripeSecret, { typescript: true });
}

function buildSubscriptionCheckoutMetadata(args: {
  organizationId: string;
  plan: string;
  offer?: string;
  trialUserId?: string;
  trialFingerprint?: string;
  trialCredits?: number;
  type?: "lifetime_purchase";
}) {
  const metadata: Record<string, string> = {
    organizationId: args.organizationId,
    plan: args.plan,
  };

  if (args.offer) metadata.offer = args.offer;
  if (args.trialUserId) metadata.trialUserId = args.trialUserId;
  if (args.trialFingerprint) metadata.trialFingerprint = args.trialFingerprint;
  if (args.trialCredits) metadata.trialCredits = String(args.trialCredits);
  if (args.type) metadata.type = args.type;

  return metadata;
}

const withHttps = (host?: string) => {
  if (!host) return null;
  if (host.startsWith("http://") || host.startsWith("https://")) return host;
  return `https://${host}`;
};

function getSiteUrl() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.SITE_URL ??
    withHttps(process.env.VERCEL_URL) ??
    "http://localhost:9155"
  );
}

function formatNotificationDate(timestamp?: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function formatStripeMoney(
  amountCents?: number | null,
  currency?: string | null,
) {
  if (amountCents === undefined || amountCents === null || !currency) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}

function formatSubscriptionPrice(subscription: Stripe.Subscription) {
  const item = subscription.items.data.at(0);
  const price = item?.price;
  const amount = formatStripeMoney(price?.unit_amount, price?.currency);
  if (!amount) return null;

  const recurring = price?.recurring;
  if (!recurring?.interval) return amount;

  const interval =
    recurring.interval_count && recurring.interval_count > 1
      ? `${recurring.interval_count} ${recurring.interval}s`
      : recurring.interval;
  return `${amount}/${interval}`;
}

function formatCheckoutSessionTotal(session: Stripe.Checkout.Session) {
  const amount = formatStripeMoney(session.amount_total, session.currency);
  if (!amount) return null;
  return session.mode === "payment" ? `${amount} one-time` : amount;
}

function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const item = subscription.items.data.at(0);
  return item?.current_period_end ? item.current_period_end * 1000 : null;
}

async function getOrganizationForNotification(
  ctx: any,
  organizationId: string,
) {
  try {
    return await ctx.runQuery(components.betterAuth.data.getOrganizationById, {
      organizationId,
    });
  } catch {
    return null;
  }
}

async function notifyAdmin(
  ctx: any,
  args: {
    event: string;
    title: string;
    dedupeKey?: string;
    details?: {
      label: string;
      value?: string | number | boolean | null;
    }[];
  },
) {
  try {
    await ctx.runAction(internalApi.telegram.sendAdminNotification, args);
  } catch (error) {
    void error;
  }
}

async function notifyBillingEvent(
  ctx: any,
  args: {
    eventId: string;
    event: string;
    title: string;
    organizationId: string;
    plan?: string | null;
    status?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    customerEmail?: string | null;
    price?: string | null;
    periodEnd?: number | null;
    trialEnd?: number | null;
  },
) {
  const org = await getOrganizationForNotification(ctx, args.organizationId);
  await notifyAdmin(ctx, {
    event: args.event,
    title: args.title,
    dedupeKey: `stripe:${args.eventId}:${args.event}`,
    details: [
      { label: "Organization", value: org?.name ?? args.organizationId },
      { label: "Org slug", value: org?.slug },
      { label: "Customer email", value: args.customerEmail },
      { label: "Plan", value: args.plan },
      { label: "Price", value: args.price },
      { label: "Status", value: args.status },
      { label: "Stripe customer", value: args.stripeCustomerId },
      { label: "Stripe subscription", value: args.stripeSubscriptionId },
      { label: "Period end", value: formatNotificationDate(args.periodEnd) },
      { label: "Trial end", value: formatNotificationDate(args.trialEnd) },
    ],
  });
}

async function getStripeCustomerEmail(
  stripe: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) return null;
  const stripeCustomer =
    typeof customer === "string"
      ? await stripe.customers.retrieve(customer)
      : customer;
  if (stripeCustomer.deleted) return null;
  return stripeCustomer.email ?? null;
}

async function requireOrg(ctx: any, orgSlug: string) {
  const user = await requireUser(ctx);
  const org = await ctx.runQuery(
    components.betterAuth.data.getOrganizationBySlug,
    { slug: orgSlug },
  );
  if (!org) throw new Error("Organization not found");

  const member = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    {
      organizationId: String(org._id),
      userId: user.id,
    },
  );
  if (!member) throw new Error("Organization not found");

  return { user, member, org: { id: String(org._id) } };
}

export const createStripeCustomer = internalAction({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    organizationId: v.string(),
  },
  handler: async (_ctx, args): Promise<{ id: string }> => {
    const customer = await requireStripe().customers.create({
      email: args.email,
      name: args.name,
      metadata: { organizationId: args.organizationId },
    });
    return { id: customer.id };
  },
});

export const createSubscriptionCheckoutSession = internalAction({
  args: {
    customerId: v.string(),
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    organizationId: v.string(),
    plan: v.string(),
    isLifetimePlan: v.boolean(),
    offer: v.optional(v.string()),
    trialUserId: v.optional(v.string()),
    trialFingerprint: v.optional(v.string()),
    trialDays: v.optional(v.number()),
    trialCredits: v.optional(v.number()),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{ id: string; url: string; expiresAt: number | null }> => {
    const trialDays =
      !args.isLifetimePlan && args.trialDays && args.trialDays > 0
        ? Math.floor(args.trialDays)
        : undefined;
    const trialCredits =
      !args.isLifetimePlan && args.trialCredits && args.trialCredits > 0
        ? Math.floor(args.trialCredits)
        : undefined;
    const subscriptionMetadata = buildSubscriptionCheckoutMetadata({
      organizationId: args.organizationId,
      plan: args.plan,
      offer: args.offer,
      trialUserId: args.trialUserId,
      trialFingerprint: args.trialFingerprint,
      trialCredits,
    });
    const checkoutMetadata = buildSubscriptionCheckoutMetadata({
      organizationId: args.organizationId,
      plan: args.plan,
      offer: args.offer,
      trialUserId: args.trialUserId,
      trialFingerprint: args.trialFingerprint,
      trialCredits,
      type: args.isLifetimePlan ? "lifetime_purchase" : undefined,
    });
    const session = await requireStripe().checkout.sessions.create({
      customer: args.customerId,
      payment_method_types: ["card"],
      line_items: [{ price: args.priceId, quantity: 1 }],
      mode: args.isLifetimePlan ? "payment" : "subscription",
      allow_promotion_codes: true,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: checkoutMetadata,
      ...(args.isLifetimePlan
        ? {}
        : {
            subscription_data: {
              ...(trialDays ? { trial_period_days: trialDays } : {}),
              metadata: subscriptionMetadata,
            },
          }),
    });

    if (!session.url) throw new Error("Failed to create checkout session");
    return {
      id: session.id,
      url: session.url,
      expiresAt: session.expires_at ? session.expires_at * 1000 : null,
    };
  },
});

export const expireStripeCheckoutSession = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const session = await requireStripe().checkout.sessions.expire(
        args.sessionId,
      );
      return { id: session.id, status: session.status };
    } catch (error) {
      if (error instanceof Error && error.message.includes("not open")) {
        return { skipped: "session_not_open" };
      }
      throw error;
    }
  },
});

export const sendTrialCancellationReminder = internalAction({
  args: {
    email: v.string(),
    organizationId: v.string(),
    orgSlug: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (_ctx, args) => {
    const stripe = requireStripe();
    const subscription = await stripe.subscriptions.retrieve(
      args.stripeSubscriptionId,
    );
    if (subscription.status !== "trialing") {
      return { skipped: "subscription_not_trialing" };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "Thumbfa.st <noreply@thumbfa.st>";
    if (!apiKey || !from) return { skipped: "email_not_configured" };

    const billingUrl = `${getSiteUrl()}/orgs/${args.orgSlug}/settings/billing`;
    const emailContent = renderMarkdownEmail({
      preview: "Your Thumbfa.st Pro trial ends tomorrow.",
      badgeLabel: "Thumbfa.st",
      markdown: `
        # Your Pro trial ends tomorrow

        Your Thumbfa.st Pro trial is scheduled to become a paid subscription in 1 day.

        If you want to keep Pro, no action is needed. If you want to cancel before billing starts, open your billing settings:

        [Manage billing](${billingUrl})
      `,
    });

    await upfetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: {
        from,
        to: args.email,
        subject:
          process.env.NODE_ENV === "development"
            ? "[DEV] Your Thumbfa.st Pro trial ends tomorrow"
            : "Your Thumbfa.st Pro trial ends tomorrow",
        text: emailContent.text,
        html: emailContent.html,
      },
    });

    return { ok: true };
  },
});

export const expireTrialCreditsAfterTrial = internalAction({
  args: {
    organizationId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await requireStripe().subscriptions.retrieve(
      args.stripeSubscriptionId,
    );
    if (subscription.status === "active") {
      return { skipped: "subscription_active" };
    }

    return ctx.runMutation(internalApi.credits.expireSubscriptionCredits, {
      orgId: args.organizationId,
      referenceId: `${args.stripeSubscriptionId}:trial_end`,
      type: "trial_expired",
      reason: "Trial credits expired",
    });
  },
});

export const createStripePortalSession = internalAction({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (_ctx, args): Promise<{ url: string }> => {
    const session = await requireStripe().billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });
    return { url: session.url };
  },
});

export const createCreditCheckoutSession = internalAction({
  args: {
    customerId: v.string(),
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    organizationId: v.string(),
    credits: v.number(),
    packId: v.string(),
  },
  handler: async (_ctx, args): Promise<{ url: string }> => {
    const session = await requireStripe().checkout.sessions.create({
      customer: args.customerId,
      payment_method_types: ["card"],
      line_items: [{ price: args.priceId, quantity: 1 }],
      mode: "payment",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        organizationId: args.organizationId,
        type: "credit_purchase",
        credits: String(args.credits),
        packId: args.packId,
      },
    });

    if (!session.url) throw new Error("Failed to create checkout session");
    return { url: session.url };
  },
});

export const getStripePaymentSummary = internalAction({
  args: { customerId: v.string() },
  handler: async (_ctx, args) => {
    const stripe = requireStripe();
    const [invoices, upcomingInvoice] = await Promise.all([
      stripe.invoices.list({
        customer: args.customerId,
        limit: 12,
      }),
      stripe.invoices
        .createPreview({
          customer: args.customerId,
        })
        .catch(() => null),
    ]);

    return {
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        created: invoice.created * 1000,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      })),
      upcomingInvoice: upcomingInvoice
        ? {
            amountDue: upcomingInvoice.amount_due,
            currency: upcomingInvoice.currency,
            periodStart: upcomingInvoice.period_start
              ? upcomingInvoice.period_start * 1000
              : null,
            periodEnd: upcomingInvoice.period_end
              ? upcomingInvoice.period_end * 1000
              : null,
          }
        : null,
    };
  },
});

export const getStripeCheckoutSessionSummary = internalAction({
  args: { sessionId: v.string() },
  handler: async (_ctx, args) => {
    const session = await requireStripe()
      .checkout.sessions.retrieve(args.sessionId)
      .catch(() => null);
    if (
      session?.metadata?.type === "credit_purchase" &&
      session.metadata.credits
    ) {
      return {
        type: "credit_purchase",
        credits: Number(session.metadata.credits),
      };
    }

    return { type: "subscription", credits: null };
  },
});

export const upsertCustomProviderApiKey = action({
  args: {
    orgSlug: v.string(),
    provider: customProviderValidator,
    apiKey: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { user, member, org } = await requireOrg(ctx, args.orgSlug);
    requireBillingManager(member);
    if (args.provider === "apiyi") requireProductAdmin(user);
    const trimmedKey = args.apiKey.trim();
    if (!trimmedKey) throw new Error("API key is required");
    await testProviderApiKey(args.provider, trimmedKey);

    await ctx.runMutation(
      internalApi.billing.upsertCustomProviderApiKeyRecord,
      {
        organizationId: org.id,
        provider: args.provider,
        encryptedKey: encryptApiKey(trimmedKey),
        label: args.label?.trim() || undefined,
        start: trimmedKey.slice(0, args.provider === "openai" ? 7 : 8),
      },
    );
    return { success: true };
  },
});

async function testProviderApiKey(provider: CustomProvider, apiKey: string) {
  try {
    if (provider === "openai") {
      await upfetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return;
    }

    if (provider === "apiyi") {
      await upfetch("https://api.apiyi.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return;
    }

    await upfetch("https://generativelanguage.googleapis.com/v1/models", {
      params: { key: apiKey },
    });
  } catch {
    throw new Error(`Invalid ${getProviderLabel(provider)} API key`);
  }
}

function normalizeStripePlan(value?: string | null) {
  if (!value) return null;
  if (STRIPE_PLAN_NAMES.has(value)) return value;
  if (value.startsWith("pro")) return "pro";
  if (value.startsWith("ultra")) return "ultra";
  if (value.startsWith("poweruser")) return "poweruser";
  return null;
}

function getPlanFromSubscription(
  subscription: Stripe.Subscription,
  fallbackPlan?: string | null,
) {
  const item = subscription.items.data.at(0);
  return (
    normalizeStripePlan(subscription.metadata.plan) ??
    normalizeStripePlan(item?.price.metadata.plan) ??
    normalizeStripePlan(item?.price.lookup_key) ??
    normalizeStripePlan(fallbackPlan) ??
    "free"
  );
}

function getSubscriptionPatch(
  subscription: Stripe.Subscription,
  fallbackPlan?: string | null,
) {
  const item = subscription.items.data.at(0);
  return {
    plan: getPlanFromSubscription(subscription, fallbackPlan),
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    periodStart: item?.current_period_start
      ? item.current_period_start * 1000
      : undefined,
    periodEnd: item?.current_period_end
      ? item.current_period_end * 1000
      : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

function getCustomerId(customer: string | { id?: string } | null | undefined) {
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

async function getOrganizationIdByStripeCustomerId(
  ctx: any,
  stripeCustomerId?: string | null,
) {
  if (!stripeCustomerId) return null;
  const org = await ctx.runQuery(
    (components as any).betterAuth.data.getOrganizationByStripeCustomerId,
    { stripeCustomerId },
  );
  return org ? String(org._id) : null;
}

function getSubscriptionRenewalReferenceId(
  subscriptionId: string,
  periodStart?: number,
) {
  return periodStart ? `${subscriptionId}:${periodStart}` : subscriptionId;
}

async function getExistingSubscriptionByStripeId(
  ctx: any,
  subscriptionId: string,
) {
  return ctx.runQuery(
    internalApi.billing.getSubscriptionByStripeSubscriptionId,
    {
      stripeSubscriptionId: subscriptionId,
    },
  );
}

export const processStripeWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        status: number;
        error: string;
        message?: string;
        notified?: boolean;
      }
  > => {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecret || !webhookSecret) {
      return { ok: false, status: 500, error: "Stripe is not configured" };
    }

    const stripe = new Stripe(stripeSecret, { typescript: true });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        webhookSecret,
      );
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error: "Invalid Stripe webhook signature",
        message: error instanceof Error ? error.message : "Invalid signature",
      };
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = getCustomerId(session.customer);
        const organizationId =
          session.metadata?.organizationId ??
          (await getOrganizationIdByStripeCustomerId(ctx, stripeCustomerId));
        const plan = session.metadata?.plan ?? "free";
        if (!organizationId) return { ok: true };

        if (session.metadata?.type === "credit_purchase") {
          const amount = Number(session.metadata?.credits ?? 0);
          await ctx.runMutation(internalApi.credits.grantSubscriptionCredits, {
            orgId: organizationId,
            plan,
            type: "purchase",
            referenceId: session.id,
            amount,
          });
          return { ok: true };
        }

        if (session.metadata?.type === "lifetime_purchase") {
          const existing =
            organizationId && stripeCustomerId
              ? await ctx.runQuery(internalApi.billing.getSubscriptionForOrg, {
                  organizationId,
                })
              : null;
          if (
            existing?.stripeSubscriptionId &&
            existing.status !== "lifetime"
          ) {
            try {
              await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
            } catch {
              // Keep lifetime activation from being blocked by an already-canceled legacy subscription.
            }
          }
          await ctx.runMutation(
            internalApi.billing.upsertSubscriptionFromStripe,
            {
              organizationId,
              plan,
              stripeCustomerId,
              status: "lifetime",
            },
          );
          await notifyBillingEvent(ctx, {
            eventId: event.id,
            event: "billing.paid_upgrade",
            title: "Lifetime plan purchased",
            organizationId,
            plan,
            price: formatCheckoutSessionTotal(session),
            status: "lifetime",
            stripeCustomerId,
            customerEmail:
              session.customer_details?.email ??
              session.customer_email ??
              (await getStripeCustomerEmail(stripe, session.customer)),
          });
          return { ok: true };
        }

        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );
          if (
            subscription.status === "active" ||
            subscription.status === "trialing"
          ) {
            const trialCredits = Number(session.metadata?.trialCredits ?? 0);
            if (
              subscription.status === "trialing" &&
              session.metadata?.offer === "onboarding_trial" &&
              session.metadata.trialUserId
            ) {
              const redemption = await ctx.runMutation(
                internalApi.billing.recordTrialRedemption,
                {
                  organizationId,
                  userId: session.metadata.trialUserId,
                  fingerprint: session.metadata.trialFingerprint || undefined,
                  status: "started",
                  stripeCustomerId: getStripeCustomerId(subscription.customer),
                  stripeSubscriptionId: subscription.id,
                  stripeCheckoutSessionId: session.id,
                },
              );
              if (
                !redemption.created &&
                redemption.stripeCheckoutSessionId !== session.id
              ) {
                await stripe.subscriptions.cancel(subscription.id);
                return { ok: true };
              }
            }
            await ctx.runMutation(
              internalApi.billing.upsertSubscriptionFromStripe,
              {
                organizationId,
                ...getSubscriptionPatch(subscription),
              },
            );
            await ctx.runMutation(
              internalApi.credits.grantSubscriptionCredits,
              {
                orgId: organizationId,
                plan: getPlanFromSubscription(subscription),
                type: "subscription_start",
                referenceId: subscription.id,
                amount:
                  subscription.status === "trialing" && trialCredits > 0
                    ? trialCredits
                    : undefined,
              },
            );

            if (subscription.status === "trialing" && subscription.trial_end) {
              const trialEndsAt = subscription.trial_end * 1000;
              const remindAt = trialEndsAt - TRIAL_REMINDER_LEAD_MS;
              const email =
                session.customer_details?.email ??
                session.customer_email ??
                (await getStripeCustomerEmail(stripe, session.customer));
              const org = await ctx.runQuery(
                (components as any).betterAuth.data.getOrganizationById,
                { organizationId },
              );
              if (email && org?.slug && remindAt > Date.now()) {
                const reminder = await ctx.runMutation(
                  internalApi.billing.markTrialReminderScheduled,
                  {
                    stripeSubscriptionId: subscription.id,
                    scheduledAt: remindAt,
                  },
                );
                if (reminder.scheduled) {
                  await ctx.scheduler.runAt(
                    remindAt,
                    internalApi.billingNode.sendTrialCancellationReminder,
                    {
                      email,
                      organizationId,
                      orgSlug: org.slug,
                      stripeSubscriptionId: subscription.id,
                    },
                  );
                }
              }
              if (trialCredits > 0 && trialEndsAt > Date.now()) {
                const expiration = await ctx.runMutation(
                  internalApi.billing.markTrialCreditsExpirationScheduled,
                  {
                    stripeSubscriptionId: subscription.id,
                    scheduledAt: trialEndsAt,
                  },
                );
                if (expiration.scheduled) {
                  await ctx.scheduler.runAt(
                    trialEndsAt,
                    internalApi.billingNode.expireTrialCreditsAfterTrial,
                    {
                      organizationId,
                      stripeSubscriptionId: subscription.id,
                    },
                  );
                }
              }
              await notifyBillingEvent(ctx, {
                eventId: event.id,
                event: "billing.trial_started",
                title: "New trial started",
                organizationId,
                plan: getPlanFromSubscription(subscription),
                price: formatSubscriptionPrice(subscription),
                status: subscription.status,
                stripeCustomerId: getStripeCustomerId(subscription.customer),
                stripeSubscriptionId: subscription.id,
                customerEmail: email,
                trialEnd: subscription.trial_end
                  ? subscription.trial_end * 1000
                  : null,
                periodEnd: getSubscriptionPeriodEnd(subscription),
              });
            } else if (subscription.status === "active") {
              await notifyBillingEvent(ctx, {
                eventId: event.id,
                event: "billing.paid_upgrade",
                title: "Paid upgrade completed",
                organizationId,
                plan: getPlanFromSubscription(subscription),
                price:
                  formatCheckoutSessionTotal(session) ??
                  formatSubscriptionPrice(subscription),
                status: subscription.status,
                stripeCustomerId: getStripeCustomerId(subscription.customer),
                stripeSubscriptionId: subscription.id,
                customerEmail:
                  session.customer_details?.email ??
                  session.customer_email ??
                  (await getStripeCustomerEmail(stripe, session.customer)),
                periodEnd: getSubscriptionPeriodEnd(subscription),
              });
            }
          }
        }
      }

      if (event.type === "customer.subscription.updated") {
        const subscription = event.data.object as Stripe.Subscription;
        const existing = await getExistingSubscriptionByStripeId(
          ctx,
          subscription.id,
        );
        const organizationId =
          subscription.metadata.organizationId ?? existing?.organizationId;
        if (organizationId) {
          const patch = getSubscriptionPatch(subscription, existing?.plan);
          if (
            existing?.periodStart &&
            patch.periodStart &&
            patch.periodStart < existing.periodStart
          ) {
            return { ok: true };
          }
          await ctx.runMutation(
            internalApi.billing.upsertSubscriptionFromStripe,
            {
              organizationId,
              ...patch,
            },
          );
          const grant = getSubscriptionRenewalGrant({
            previousPeriodStart: existing?.periodStart,
            nextPeriodStart: patch.periodStart,
            nextStatus: patch.status,
            nextPlan: patch.plan,
          });
          if (grant) {
            await ctx.runMutation(
              internalApi.credits.grantSubscriptionCredits,
              {
                orgId: organizationId,
                plan: grant.plan,
                type: grant.type,
                referenceId: getSubscriptionRenewalReferenceId(
                  subscription.id,
                  patch.periodStart,
                ),
              },
            );
          }
          if (
            patch.status === "active" &&
            existing?.status &&
            existing.status !== "active"
          ) {
            await notifyBillingEvent(ctx, {
              eventId: event.id,
              event: "billing.paid_upgrade",
              title: "Subscription became active",
              organizationId,
              plan: patch.plan,
              price: formatSubscriptionPrice(subscription),
              status: patch.status,
              stripeCustomerId: patch.stripeCustomerId,
              stripeSubscriptionId: subscription.id,
              customerEmail: await getStripeCustomerEmail(
                stripe,
                subscription.customer,
              ),
              periodEnd: patch.periodEnd,
            });
          }
          if (patch.cancelAtPeriodEnd && !existing?.cancelAtPeriodEnd) {
            await notifyBillingEvent(ctx, {
              eventId: event.id,
              event: "billing.churn_scheduled",
              title: "Subscription cancellation scheduled",
              organizationId,
              plan: patch.plan,
              price: formatSubscriptionPrice(subscription),
              status: patch.status,
              stripeCustomerId: patch.stripeCustomerId,
              stripeSubscriptionId: subscription.id,
              customerEmail: await getStripeCustomerEmail(
                stripe,
                subscription.customer,
              ),
              periodEnd: patch.periodEnd,
            });
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const existing = await getExistingSubscriptionByStripeId(
          ctx,
          subscription.id,
        );
        const organizationId =
          subscription.metadata.organizationId ?? existing?.organizationId;
        if (organizationId) {
          await ctx.runMutation(
            internalApi.billing.upsertSubscriptionFromStripe,
            {
              organizationId,
              ...getSubscriptionPatch(subscription, existing?.plan),
              plan: "free",
              status: "canceled",
            },
          );
          await ctx.runMutation(internalApi.credits.expireSubscriptionCredits, {
            orgId: organizationId,
            referenceId: subscription.id,
          });
          await notifyBillingEvent(ctx, {
            eventId: event.id,
            event: "billing.churned",
            title: "Subscription churned",
            organizationId,
            plan: existing?.plan ?? getPlanFromSubscription(subscription),
            price: formatSubscriptionPrice(subscription),
            status: "canceled",
            stripeCustomerId: getStripeCustomerId(subscription.customer),
            stripeSubscriptionId: subscription.id,
            customerEmail: await getStripeCustomerEmail(
              stripe,
              subscription.customer,
            ),
            periodEnd:
              getSubscriptionPeriodEnd(subscription) ?? existing?.periodEnd,
          });
        }
      }

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await notifyAdmin(ctx, {
        event: "convex.server_error",
        title: "Convex billing webhook failed",
        dedupeKey: `convex-error:billing-webhook:${event.id}`,
        details: [
          { label: "Stripe event", value: event.type },
          { label: "Stripe event ID", value: event.id },
          { label: "Error", value: message },
        ],
      });
      return {
        ok: false,
        status: 500,
        error: "Billing webhook failed",
        message: "Stripe can retry this event.",
        notified: true,
      };
    }
  },
});
