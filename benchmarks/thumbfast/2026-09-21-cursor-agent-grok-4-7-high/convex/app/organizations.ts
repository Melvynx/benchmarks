/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { getActiveSubscription, getOrgPlanLimits } from "../orgPlanLimits";
import { ensureSignupCreditBalance } from "../signupCredits";
import {
  MAX_ROWS,
  asCtx,
  createOwnedOrganization,
  getSignupFingerprintForUser,
  isThumbnailAgentEnabled,
  requireAdminRole,
  requireOrg,
  requireOwnerRole,
  requireUser,
} from "./shared";

export const firstOrg = mutationGeneric({
  args: { referralCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const user = await requireUser(appCtx);
    const signupFingerprint = await getSignupFingerprintForUser(
      appCtx,
      user.id,
    );
    const members = await appCtx.runQuery(
      components.betterAuth.data.listMembersByUser,
      { userId: user.id, limit: 20 },
    );
    const firstMember = members
      .slice()
      .sort((a: any, b: any) => Number(a.createdAt) - Number(b.createdAt))[0];
    if (!firstMember) {
      const result = await createOwnedOrganization(appCtx, {
        user,
        referralCode: args.referralCode,
        signupFingerprint,
      });
      return { redirectTo: result.redirectTo };
    }

    await ensureSignupCreditBalance(appCtx, {
      organizationId: String(firstMember.organizationId),
      userId: user.id,
      fingerprint: signupFingerprint,
    });

    const org = await appCtx.runQuery(
      components.betterAuth.data.getOrganizationById,
      { organizationId: firstMember.organizationId },
    );
    return { redirectTo: org?.slug ? `/orgs/${org.slug}/` : "/orgs/new" };
  },
});

export const createOrganizationForCurrentUser = mutationGeneric({
  args: {
    name: v.string(),
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const user = await requireUser(appCtx);
    const signupFingerprint = await getSignupFingerprintForUser(
      appCtx,
      user.id,
    );
    const name = args.name.trim();
    if (!name) throw new Error("Organization name is required");

    const result = await createOwnedOrganization(appCtx, {
      user,
      name,
      referralCode: args.referralCode,
      signupFingerprint,
    });
    return { redirectTo: result.redirectTo };
  },
});

export const listUserOrganizations = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const appCtx = asCtx(ctx);
    const user = await requireUser(appCtx);
    const members = await appCtx.runQuery(
      components.betterAuth.data.listMembersByUser,
      { userId: user.id, limit: MAX_ROWS },
    );
    const organizations = await appCtx.runQuery(
      components.betterAuth.data.listOrganizationsByIds,
      {
        organizationIds: members.map((member: any) =>
          String(member.organizationId),
        ),
      },
    );
    const orgById = new Map<string, any>(
      organizations.map((org: any) => [String(org._id), org]),
    );

    return {
      items: members
        .slice()
        .sort((a: any, b: any) => Number(a.createdAt) - Number(b.createdAt))
        .flatMap((member: any) => {
          const org = orgById.get(String(member.organizationId));
          if (!org?.slug) return [];

          return [
            {
              id: String(org._id),
              name: org.name,
              slug: org.slug,
              logo: org.logo ?? null,
              role: member.role,
            },
          ];
        }),
    };
  },
});

export const orgSettings = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org, member } = await requireOrg(appCtx, args.orgSlug);
    const [subscription, limits, thumbnailAgentEnabled] = await Promise.all([
      getActiveSubscription(appCtx, org.id),
      getOrgPlanLimits(appCtx, org.id),
      isThumbnailAgentEnabled(appCtx),
    ]);

    return {
      org: {
        ...org,
        subscription,
      },
      limits: {
        maxGenerations: limits.maxGenerations,
        noWatermark: limits.noWatermark,
      },
      role: member.role,
      features: {
        thumbnailAgentEnabled,
      },
    };
  },
});

export const updateOrgName = mutationGeneric({
  args: {
    orgSlug: v.string(),
    name: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org } = await requireOrg(appCtx, args.orgSlug);
    requireAdminRole(member);
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    const updated = await appCtx.runMutation(
      components.betterAuth.data.patchOrganization,
      {
        organizationId: org.id,
        update: { logo: args.logo, name },
      },
    );
    return {
      org: {
        id: String(updated._id),
        name: updated.name,
        slug: updated.slug,
        logo: updated.logo ?? null,
      },
    };
  },
});

export const updateOrgSlug = mutationGeneric({
  args: { orgSlug: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org } = await requireOrg(appCtx, args.orgSlug);
    requireOwnerRole(member);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("Slug is required");
    const updated = await appCtx.runMutation(
      components.betterAuth.data.patchOrganization,
      {
        organizationId: org.id,
        update: { slug },
      },
    );
    return {
      org: {
        id: String(updated._id),
        name: updated.name,
        slug: updated.slug,
      },
    };
  },
});

export const deleteOrg = mutationGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org } = await requireOrg(appCtx, args.orgSlug);
    requireOwnerRole(member);

    await appCtx.runMutation(components.betterAuth.data.deleteOrganization, {
      organizationId: org.id,
    });

    return { success: true };
  },
});

export const listMembers = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org } = await requireOrg(appCtx, args.orgSlug);
    requireAdminRole(member);
    const [members, invitations] = await Promise.all([
      appCtx.runQuery(components.betterAuth.data.listMembersByOrganization, {
        organizationId: org.id,
        limit: MAX_ROWS,
      }),
      appCtx.runQuery(
        components.betterAuth.data.listInvitationsByOrganization,
        {
          organizationId: org.id,
          limit: MAX_ROWS,
        },
      ),
    ]);
    const users = await appCtx.runQuery(
      components.betterAuth.data.listUsersByIds,
      {
        userIds: members.map((member: any) => member.userId),
      },
    );
    const usersById = new Map<string, any>(
      users.map((user: any) => [String(user._id), user]),
    );

    return {
      members: members.map((member: any) => {
        const user = usersById.get(member.userId);
        return {
          id: String(member._id),
          role: member.role,
          user: {
            id: String(user?._id ?? member.userId),
            email: user?.email ?? "",
            name: user?.name ?? "",
            image: user?.image ?? null,
          },
        };
      }),
      invitations: invitations
        .filter((invitation: any) => invitation.status === "pending")
        .map((invitation: any) => ({
          id: String(invitation._id),
          email: invitation.email,
          role: invitation.role ?? "member",
          status: invitation.status ?? "pending",
          expiresAt: invitation.expiresAt ?? null,
        })),
    };
  },
});

export const inviteMember = mutationGeneric({
  args: { orgSlug: v.string(), email: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org, user } = await requireOrg(appCtx, args.orgSlug);
    requireAdminRole(member);
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    const invitation = await appCtx.runMutation(
      components.betterAuth.data.createInvitationForAdmin,
      {
        organizationId: org.id,
        email,
        role:
          args.role === "admin" || args.role === "owner" ? args.role : "member",
        inviterId: user.id,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      },
    );

    return {
      invitation: {
        id: String(invitation._id ?? invitation.id),
        email: invitation.email,
        role: invitation.role ?? "member",
        status: invitation.status ?? "pending",
        expiresAt: invitation.expiresAt ?? null,
      },
    };
  },
});

export const updateMemberRole = mutationGeneric({
  args: {
    orgSlug: v.string(),
    memberId: v.string(),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org } = await requireOrg(appCtx, args.orgSlug);
    requireAdminRole(member);

    const updated = await appCtx.runMutation(
      components.betterAuth.data.patchMemberRoleForAdmin,
      {
        memberId: args.memberId,
        organizationId: org.id,
        role: args.role,
      },
    );
    if (!updated) throw new Error("Member not found");

    return {
      member: {
        id: String(updated._id),
        role: updated.role,
      },
    };
  },
});

export const removeMember = mutationGeneric({
  args: { orgSlug: v.string(), memberId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member, org } = await requireOrg(appCtx, args.orgSlug);
    requireAdminRole(member);
    if (String(member._id) === args.memberId) {
      throw new Error("You cannot remove yourself");
    }

    const removed = await appCtx.runMutation(
      components.betterAuth.data.deleteMemberForAdmin,
      {
        memberId: args.memberId,
        organizationId: org.id,
      },
    );
    if (!removed) throw new Error("Member not found");

    return { success: true };
  },
});

export const cancelInvitation = mutationGeneric({
  args: { orgSlug: v.string(), invitationId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { member } = await requireOrg(appCtx, args.orgSlug);
    requireAdminRole(member);

    const invitation = await appCtx.runMutation(
      components.betterAuth.data.patchInvitation,
      {
        invitationId: args.invitationId,
        status: "canceled",
      },
    );
    if (!invitation) throw new Error("Invitation not found");

    return { success: true };
  },
});

export const acceptInvitation = mutationGeneric({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const user = await requireUser(appCtx);
    const invitation = await appCtx.runQuery(
      components.betterAuth.data.getInvitationById,
      { invitationId: args.invitationId },
    );
    if (
      !invitation ||
      invitation.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new Error("Invitation not found");
    }
    const org = await appCtx.runQuery(
      components.betterAuth.data.getOrganizationById,
      { organizationId: invitation.organizationId },
    );
    await appCtx.runMutation(components.betterAuth.data.upsertMember, {
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role ?? "member",
    });
    await appCtx.runMutation(components.betterAuth.data.patchInvitation, {
      invitationId: args.invitationId,
      status: "accepted",
    });
    return { redirectTo: `/orgs/${org.slug}/` };
  },
});
