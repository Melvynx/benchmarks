import {
  actionGeneric,
  internalActionGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";
import { Lumail, LumailNotFoundError } from "lumail";
import { components } from "../_generated/api";
import { asCtx, requireUser } from "./shared";

export const getProfile = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(asCtx(ctx));
    return { user };
  },
});

export const updateProfile = mutationGeneric({
  args: { name: v.string(), image: v.optional(v.union(v.null(), v.string())) },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const user = await requireUser(appCtx);
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");

    const updated = await appCtx.runMutation(
      components.betterAuth.data.patchUser,
      {
        userId: user.id,
        update: { name, image: args.image },
      },
    );

    return {
      user: {
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        emailVerified: Boolean(updated.emailVerified),
        image: updated.image ?? null,
      },
    };
  },
});

function requireLumailClient() {
  const apiKey = process.env.LUMAIL_API_TOKEN;
  if (!apiKey) {
    throw new Error("Lumail API token is not configured");
  }

  return new Lumail({ apiKey });
}

function buildLumailSubscriberPayload(args: {
  email: string;
  name: string | null;
  organization?: { id: string; name: string | null };
}) {
  const fields: Record<string, string> = {};

  if (args.organization?.name) fields.Organization = args.organization.name;
  if (args.organization?.id) fields.OrganizationId = args.organization.id;

  return {
    email: args.email,
    name: args.name,
    tags: ["onboarding"],
    fields,
    resubscribe: true,
    triggerWorkflows: true,
  };
}

export const syncLumailSubscriberForSignup = internalActionGeneric({
  args: {
    user: v.object({
      email: v.string(),
      name: v.union(v.null(), v.string()),
    }),
    organization: v.object({
      id: v.string(),
      name: v.union(v.null(), v.string()),
    }),
  },
  handler: async (_ctx, args) => {
    const lumail = requireLumailClient();
    const payload = buildLumailSubscriberPayload({
      email: args.user.email,
      name: args.user.name,
      organization: args.organization,
    });

    await lumail.subscribers.create(payload);
    return { success: true };
  },
});

export const getEmailSubscription = actionGeneric({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(asCtx(ctx));
    const lumail = requireLumailClient();

    try {
      const { subscriber } = await lumail.subscribers.get(user.email);

      return {
        email: subscriber.email,
        subscribed: subscriber.status === "SUBSCRIBED",
      };
    } catch (error) {
      if (!(error instanceof LumailNotFoundError)) {
        throw error;
      }

      return {
        email: user.email,
        subscribed: false,
      };
    }
  },
});

export const updateEmailSubscription = actionGeneric({
  args: { subscribed: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(asCtx(ctx));
    const lumail = requireLumailClient();

    if (args.subscribed) {
      await lumail.subscribers.create({
        email: user.email,
        name: user.name,
        tags: ["onboarding"],
        resubscribe: true,
        triggerWorkflows: true,
      });

      return { success: true, subscribed: true };
    }

    try {
      await lumail.subscribers.unsubscribe(user.email);
    } catch (error) {
      if (!(error instanceof LumailNotFoundError)) {
        throw error;
      }
    }

    return { success: true, subscribed: false };
  },
});
