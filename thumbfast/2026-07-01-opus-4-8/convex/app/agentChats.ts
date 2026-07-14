/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  asCtx,
  firstUserMessageTitle,
  requireOrg,
  requireThumbnailAgentAccess,
} from "./shared";

export const listAgentChats = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, member } = await requireOrg(appCtx, args.orgSlug);
    await requireThumbnailAgentAccess(appCtx, member);
    const chats = await ctx.db
      .query("agentChats")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(20);

    return chats.map((chat: any) => ({
      id: String(chat._id),
      title: chat.title ?? "New Chat",
      createdAt: new Date(chat.createdAt).toISOString(),
      updatedAt: new Date(chat.updatedAt).toISOString(),
    }));
  },
});

export const agentPromptContext = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, member } = await requireOrg(appCtx, args.orgSlug);
    await requireThumbnailAgentAccess(appCtx, member);

    const notDeleted = (q: any) => q.eq(q.field("deletedAt"), undefined);
    const [people, prompts, inspirations, userImages] = await Promise.all([
      ctx.db
        .query("people")
        .withIndex("by_organization", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .filter(notDeleted)
        .take(100),
      ctx.db
        .query("prompts")
        .withIndex("by_organization_created", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .order("desc")
        .filter(notDeleted)
        .take(50),
      ctx.db
        .query("inspirations")
        .withIndex("by_organization_created", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .order("desc")
        .filter(notDeleted)
        .take(50),
      ctx.db
        .query("userImages")
        .withIndex("by_organization_created", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .order("desc")
        .filter(notDeleted)
        .take(50),
    ]);

    const categoryCounts = new Map<string, number>();
    for (const inspiration of inspirations) {
      for (const category of inspiration.categories ?? []) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }
    const topInspirationCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    const topUserImageNames = userImages
      .map((image: any) => image.label)
      .filter((label: unknown): label is string => Boolean(label))
      .slice(0, 8);

    return {
      personCount: people.length,
      recentPromptCount: prompts.length,
      topInspirationCategories,
      topUserImageNames,
    };
  },
});

export const agentChatDetail = queryGeneric({
  args: { orgSlug: v.string(), chatId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, member } = await requireOrg(appCtx, args.orgSlug);
    await requireThumbnailAgentAccess(appCtx, member);
    const chatId = ctx.db.normalizeId("agentChats", args.chatId);
    const chat = chatId ? await ctx.db.get(chatId) : null;
    if (!chat || chat.organizationId !== org.id) {
      return null;
    }

    return {
      id: String(chat._id),
      title: chat.title ?? "New Chat",
      messages: chat.messages ?? [],
      createdAt: new Date(chat.createdAt).toISOString(),
      updatedAt: new Date(chat.updatedAt).toISOString(),
    };
  },
});

export const saveAgentChat = mutationGeneric({
  args: {
    orgSlug: v.string(),
    chatId: v.optional(v.string()),
    title: v.optional(v.string()),
    messages: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, member } = await requireOrg(appCtx, args.orgSlug);
    await requireThumbnailAgentAccess(appCtx, member);
    const now = Date.now();
    const normalizedId = args.chatId
      ? ctx.db.normalizeId("agentChats", args.chatId)
      : null;
    const existing = normalizedId ? await ctx.db.get(normalizedId) : null;

    if (existing && existing.organizationId !== org.id) {
      throw new Error("Chat not found");
    }

    const title =
      args.title?.trim() ||
      existing?.title ||
      firstUserMessageTitle(args.messages) ||
      "New Chat";

    if (existing) {
      await ctx.db.patch(existing._id, {
        title,
        messages: args.messages,
        updatedAt: now,
      });
      return { id: String(existing._id), title };
    }

    const id = await ctx.db.insert("agentChats", {
      organizationId: org.id,
      title,
      messages: args.messages,
      createdAt: now,
      updatedAt: now,
    });

    return { id: String(id), title };
  },
});
