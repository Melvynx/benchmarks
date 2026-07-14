/* eslint-disable @typescript-eslint/no-explicit-any */
import { components } from "../_generated/api";
import { authComponent } from "../auth/config";
import { makeFunctionReference } from "convex/server";
import {
  createSignupFingerprint,
  ensureSignupCreditBalance,
} from "../signupCredits";

export type Ctx = {
  db: any;
  storage?: any;
  runQuery: (fn: any, args: any) => Promise<any>;
  runMutation: (fn: any, args: any) => Promise<any>;
  scheduler?: {
    runAfter: (delayMs: number, fn: any, args: any) => Promise<any>;
  };
};

export const MAX_ROWS = 500;
export const REFERRAL_SETTINGS_KEY = "default";
export const THUMBNAIL_AGENT_FEATURE_FLAG_KEY = "thumbnail-agent";
const DEFAULT_REFERRAL_CREDITS = 1;

// Mirrors DEFAULT_REFERRAL_SETTINGS in src/features/referral/referral.constants.ts
// (convex bundle cannot import from src).
export const REFERRAL_SETTINGS_DEFAULTS = {
  creditsPerReferral: DEFAULT_REFERRAL_CREDITS,
  dailyCreditCap: 5,
  monthlyCreditCap: 30,
  cookieExpiryDays: 30,
  pendingExpiryDays: 7,
  requireProductAction: true,
  burstSignupThreshold: 5,
  sameIpSignupThreshold: 3,
};
const DEFAULT_ORG_EMAIL_BASE_MAX_LENGTH = 9;
const DEFAULT_ORG_SLUG_SUFFIX_LENGTH = 3;
const DEFAULT_ORG_SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const syncLumailSubscriberForSignupRef = makeFunctionReference<
  "action",
  {
    user: { email: string; name: string | null };
    organization: { id: string; name: string | null };
  },
  { success: boolean }
>("app/profile:syncLumailSubscriberForSignup");

export const asCtx = (ctx: unknown) => ctx as Ctx;

export async function requireUser(ctx: Ctx) {
  const user = await authComponent.getAuthUser(ctx as never);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    image: user.image ?? null,
  };
}

export async function getSignupFingerprintForUser(ctx: Ctx, userId: string) {
  const sessions = await ctx.runQuery(
    components.betterAuth.data.listSessionsByUser,
    { userId, limit: 20 },
  );
  const latestSession = sessions
    .slice()
    .sort((a: any, b: any) => Number(b.createdAt) - Number(a.createdAt))[0];

  return createSignupFingerprint({
    ipAddress: latestSession?.ipAddress,
    userAgent: latestSession?.userAgent,
  });
}

export async function getOrgForUser(ctx: Ctx, userId: string, orgSlug: string) {
  const org = await ctx.runQuery(
    components.betterAuth.data.getOrganizationBySlug,
    { slug: orgSlug },
  );
  if (!org) return null;

  const member = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    {
      organizationId: String(org._id),
      userId,
    },
  );
  if (!member) return null;

  return {
    member,
    org: {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      subscription: null,
    },
  };
}

export async function requireOrg(ctx: Ctx, orgSlug: string) {
  const user = await requireUser(ctx);
  const access = await getOrgForUser(ctx, user.id, orgSlug);
  if (!access) {
    throw new Error("Organization not found");
  }
  return { user, ...access };
}

export function requireAdminRole(member: { role?: string }) {
  if (member.role !== "owner" && member.role !== "admin") {
    throw new Error("Only organization admins can perform this action");
  }
}

export async function isFeatureFlagEnabled(
  ctx: Ctx,
  key: string,
  defaultEnabled = false,
) {
  const flag = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();

  return flag?.enabled ?? defaultEnabled;
}

export async function isThumbnailAgentEnabled(ctx: Ctx) {
  return isFeatureFlagEnabled(ctx, THUMBNAIL_AGENT_FEATURE_FLAG_KEY, false);
}

export async function requireThumbnailAgentAccess(
  ctx: Ctx,
  member: { role?: string },
) {
  requireAdminRole(member);

  const enabled = await isThumbnailAgentEnabled(ctx);
  if (!enabled) {
    throw new Error("Thumbnail Agent is disabled");
  }
}

export function requireOwnerRole(member: { role?: string }) {
  if (member.role !== "owner") {
    throw new Error("Only organization owners can perform this action");
  }
}

function orgBaseFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const base = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, DEFAULT_ORG_EMAIL_BASE_MAX_LENGTH);

  return base || "workspace";
}

function randomSlugSuffix() {
  const values = new Uint8Array(DEFAULT_ORG_SLUG_SUFFIX_LENGTH);
  crypto.getRandomValues(values);

  return Array.from(
    values,
    (value) =>
      DEFAULT_ORG_SLUG_SUFFIX_ALPHABET[
        value % DEFAULT_ORG_SLUG_SUFFIX_ALPHABET.length
      ],
  ).join("");
}

async function uniqueEmailOrgIdentity(
  ctx: Ctx,
  args: { email: string; name?: string },
) {
  const slugBase = orgBaseFromEmail(args.email);
  const requestedName = args.name?.trim() || null;
  const candidates = Array.from({ length: 20 }, (_, index) => {
    const suffix = randomSlugSuffix();
    return {
      name:
        requestedName ??
        (index === 0 ? `${slugBase} corp` : `${slugBase}${suffix} corp`),
      slug: `${slugBase}${suffix}`,
    };
  });

  const slugMatches = await Promise.all(
    candidates.map(async (candidate) =>
      ctx.runQuery(components.betterAuth.data.getOrganizationBySlug, {
        slug: candidate.slug,
      }),
    ),
  );
  const nameMatches = requestedName
    ? candidates.map(() => null)
    : await Promise.all(
        candidates.map(async (candidate) =>
          ctx.runQuery(components.betterAuth.data.getOrganizationByName, {
            name: candidate.name,
          }),
        ),
      );
  const availableIndex = candidates.findIndex(
    (_candidate, index) => !slugMatches[index] && !nameMatches[index],
  );

  if (availableIndex >= 0) return candidates[availableIndex];

  const fallbackSuffix = Date.now()
    .toString(36)
    .slice(-DEFAULT_ORG_SLUG_SUFFIX_LENGTH);
  return {
    name: requestedName ?? `${slugBase}${fallbackSuffix} corp`,
    slug: `${slugBase}${fallbackSuffix}`,
  };
}

export function referralCodeFromUserId(userId: string) {
  const cleaned = userId.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (cleaned.slice(-8) || Date.now().toString(36).toUpperCase()).padEnd(
    8,
    "X",
  );
}

export async function getOrCreateReferralSettings(ctx: Ctx) {
  const existing = await ctx.db
    .query("referralSettings")
    .withIndex("by_key", (q: any) => q.eq("key", REFERRAL_SETTINGS_KEY))
    .first();
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("referralSettings", {
    key: REFERRAL_SETTINGS_KEY,
    value: { creditsPerReferral: DEFAULT_REFERRAL_CREDITS },
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(id);
}

export function referralCreditsFromSettings(settings: any) {
  const value = Number(settings?.value?.creditsPerReferral);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_REFERRAL_CREDITS;
}

export async function getOrCreateReferralProfile(
  ctx: Ctx,
  user: { id: string },
) {
  const existing = await ctx.db
    .query("referralProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user.id))
    .first();
  if (existing) return existing;

  const baseCode = referralCodeFromUserId(user.id);
  const taken = await ctx.db
    .query("referralProfiles")
    .withIndex("by_code", (q: any) => q.eq("code", baseCode))
    .first();
  const code = taken
    ? `${baseCode.slice(0, 5)}${Date.now().toString(36).slice(-3).toUpperCase()}`
    : baseCode;
  const now = Date.now();
  const id = await ctx.db.insert("referralProfiles", {
    userId: user.id,
    code,
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(id);
}

async function createPendingReferralFromCode(
  ctx: Ctx,
  args: {
    referralCode?: string;
    referredUserId: string;
    referredOrganizationId: string;
  },
) {
  const code = args.referralCode?.trim().toUpperCase();
  if (!code) return null;

  const profile = await ctx.db
    .query("referralProfiles")
    .withIndex("by_code", (q: any) => q.eq("code", code))
    .first();
  if (!profile || profile.userId === args.referredUserId) return null;

  const existingRecords = await ctx.db
    .query("referralRecords")
    .withIndex("by_profile", (q: any) => q.eq("profileId", profile._id))
    .collect();
  const alreadyTracked = existingRecords.some(
    (record: any) =>
      record.referredUserId === args.referredUserId ||
      record.referredOrganizationId === args.referredOrganizationId,
  );
  if (alreadyTracked) return null;

  const settings = await getOrCreateReferralSettings(ctx);
  const now = Date.now();
  const id = await ctx.db.insert("referralRecords", {
    profileId: profile._id,
    referredUserId: args.referredUserId,
    referredOrganizationId: args.referredOrganizationId,
    status: "pending",
    rewardAmount: referralCreditsFromSettings(settings),
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(id);
}

export async function createOwnedOrganization(
  ctx: Ctx,
  args: {
    user: { id: string; name: string; email: string; image: string | null };
    name?: string;
    referralCode?: string;
    signupFingerprint: string | null;
  },
) {
  const { name: orgName, slug } = await uniqueEmailOrgIdentity(ctx, {
    email: args.user.email,
    name: args.name,
  });
  const organization = await ctx.runMutation(
    components.betterAuth.data.createOrganization,
    {
      name: orgName,
      slug,
      logo: args.user.image,
    },
  );

  await ctx.runMutation(components.betterAuth.data.createMember, {
    organizationId: String(organization._id),
    userId: args.user.id,
    role: "owner",
  });

  await ensureSignupCreditBalance(ctx, {
    organizationId: String(organization._id),
    userId: args.user.id,
    fingerprint: args.signupFingerprint,
  });

  await createPendingReferralFromCode(ctx, {
    referralCode: args.referralCode,
    referredUserId: args.user.id,
    referredOrganizationId: String(organization._id),
  });

  await ctx.scheduler?.runAfter(0, syncLumailSubscriberForSignupRef, {
    user: {
      email: args.user.email,
      name: args.user.name,
    },
    organization: {
      id: String(organization._id),
      name: organization.name,
    },
  });

  return { organization, redirectTo: `/orgs/${slug}/` };
}

export function firstUserMessageTitle(messages: any[]) {
  const userMessage = messages.find((message) => message?.role === "user");
  const textPart = Array.isArray(userMessage?.parts)
    ? userMessage.parts.find((part: any) => part?.type === "text")
    : null;
  const text =
    typeof textPart?.text === "string"
      ? textPart.text
      : typeof userMessage?.content === "string"
        ? userMessage.content
        : "";

  return text.trim().slice(0, 100) || null;
}

export function toStoredImageUrl(value: any) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url ?? null;
}

export function toStoredImage(url: string) {
  return { url };
}
