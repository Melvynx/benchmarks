/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this module relies on dynamic Convex component APIs that cannot be typed precisely without a larger generated-API migration.
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { sendMarkdownEmail } from "./email/sendMarkdownEmail";
import { getOrgPlanLimits } from "./orgPlanLimits";
import { getDisplayThumbnailUrl } from "./thumbnailUrls";

const SITE_URL = "https://thumbfa.st";
const MAX_THUMBNAIL_ROWS = 500;

type GenerationEmailClaim =
  | { skip: true }
  | {
      skip: false;
      userId: string;
      organizationId: string;
      promptId: string | null;
      promptText: string;
      imageUrl: string;
    };

// Atomically claim the email notification: marks the generation as notified and
// returns the payload only when it still needs an email (no client saw it yet).
export const claimGenerationEmailNotification = internalMutation({
  args: { generationId: v.string() },
  handler: async (ctx, args): Promise<GenerationEmailClaim> => {
    const generationId = ctx.db.normalizeId("generations", args.generationId);
    const generation: any = generationId
      ? await ctx.db.get(generationId)
      : null;

    if (
      !generation ||
      generation.hiddenAt ||
      generation.status !== "succeeded" ||
      generation.notifiedAt ||
      !generation.createdByUserId
    ) {
      return { skip: true };
    }

    const acknowledged = await ctx.db
      .query("generationNotificationAcknowledgements")
      .withIndex("by_generation", (q: any) =>
        q.eq("generationId", generation._id),
      )
      .first();
    if (acknowledged) return { skip: true };

    const thumbnails: any[] = await ctx.db
      .query("thumbnails")
      .withIndex("by_generation", (q: any) =>
        q.eq("generationId", generation._id),
      )
      .take(MAX_THUMBNAIL_ROWS);
    const succeeded = thumbnails.find(
      (thumbnail) => thumbnail.status === "succeeded" && !thumbnail.hiddenAt,
    );
    const limits = await getOrgPlanLimits(
      ctx as any,
      generation.organizationId,
    );
    const imageUrl = getDisplayThumbnailUrl(succeeded, {
      canViewCleanImage: Boolean(limits.noWatermark),
    });

    if (!imageUrl) return { skip: true };

    await ctx.db.patch(generation._id, {
      notifiedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      skip: false,
      userId: generation.createdByUserId,
      organizationId: generation.organizationId,
      promptId: generation.promptId ? String(generation.promptId) : null,
      promptText: generation.prompt,
      imageUrl,
    };
  },
});

// Emails the user who started a generation once it finished, but only when no
// in-app client acknowledged the completion (i.e. they are away from the app).
export const notifyGenerationCompleted = internalAction({
  args: { generationId: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const claim: GenerationEmailClaim = await ctx.runMutation(
      internal.notifications.claimGenerationEmailNotification,
      { generationId: args.generationId },
    );
    if (claim.skip) return { sent: false };

    const user: any = await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId: claim.userId },
    );
    if (!user?.email) return { sent: false };

    const org: any = await ctx.runQuery(
      components.betterAuth.data.getOrganizationById,
      { organizationId: claim.organizationId },
    );
    const link =
      org?.slug && claim.promptId
        ? `${SITE_URL}/orgs/${org.slug}/thumbnails/${claim.promptId}`
        : SITE_URL;

    await sendMarkdownEmail({
      to: user.email,
      subject: "Your thumbnail is ready",
      preview: "Your thumbnail generation just finished.",
      heroImageUrl: claim.imageUrl,
      markdown: `
        # Your thumbnail is ready

        The thumbnail you generated on Thumbfa.st just finished. Open it to view, download, or refine it.

        [View your thumbnail](${link} "button")
      `,
    });

    return { sent: true };
  },
});
