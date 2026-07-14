/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import {
  MAX_ROWS,
  asCtx,
  getOrCreateReferralProfile,
  getOrCreateReferralSettings,
  referralCodeFromUserId,
  referralCreditsFromSettings,
  requireOrg,
} from "./shared";

function referralOrigin() {
  return process.env.VITE_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
}

function referralStats(records: any[]) {
  return {
    total: records.length,
    pending: records.filter((record: any) => record.status === "pending")
      .length,
    credited: records.filter((record: any) =>
      ["credited", "rewarded"].includes(record.status),
    ).length,
  };
}

function referralPayload(args: {
  code: string;
  records: any[];
  settings: any;
}) {
  const origin = referralOrigin();

  return {
    code: args.code,
    link: origin ? `${origin}/?ref=${args.code}` : `/?ref=${args.code}`,
    stats: referralStats(args.records),
    settings: {
      creditsPerReferral: referralCreditsFromSettings(args.settings),
    },
  };
}

export const getReferralMe = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireOrg(asCtx(ctx), args.orgSlug);
    const profile = await ctx.db
      .query("referralProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", user.id))
      .first();
    const settings = await ctx.db
      .query("referralSettings")
      .withIndex("by_key", (q: any) => q.eq("key", "default"))
      .first();
    const records = profile
      ? await ctx.db
          .query("referralRecords")
          .withIndex("by_profile", (q: any) => q.eq("profileId", profile._id))
          .take(MAX_ROWS)
      : [];
    const code = profile?.code ?? referralCodeFromUserId(user.id);

    return referralPayload({ code, records, settings });
  },
});

export const getOrCreateReferralMe = mutationGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { user } = await requireOrg(appCtx, args.orgSlug);
    const [profile, settings] = await Promise.all([
      getOrCreateReferralProfile(appCtx, user),
      getOrCreateReferralSettings(appCtx),
    ]);
    const records = await ctx.db
      .query("referralRecords")
      .withIndex("by_profile", (q: any) => q.eq("profileId", profile._id))
      .take(MAX_ROWS);

    return referralPayload({ code: profile.code, records, settings });
  },
});
