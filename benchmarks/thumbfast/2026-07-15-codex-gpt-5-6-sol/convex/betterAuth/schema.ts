import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tables = {
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.union(v.null(), v.string())),
    // admin plugin
    role: v.optional(v.union(v.null(), v.string())),
    banned: v.optional(v.union(v.null(), v.boolean())),
    banReason: v.optional(v.union(v.null(), v.string())),
    banExpires: v.optional(v.union(v.null(), v.number())),
  })
    .index("email_name", ["email", "name"])
    .index("email", ["email"])
    .index("name", ["name"])
    .index("role", ["role"])
    .index("banned", ["banned"])
    .index("banned_role", ["banned", "role"])
    .index("createdAt", ["createdAt"])
    .index("userId", ["userId"]),

  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.union(v.null(), v.string())),
    userAgent: v.optional(v.union(v.null(), v.string())),
    userId: v.string(),
    // organization plugin
    activeOrganizationId: v.optional(v.union(v.null(), v.string())),
    // admin plugin
    impersonatedBy: v.optional(v.union(v.null(), v.string())),
  })
    .index("expiresAt", ["expiresAt"])
    .index("expiresAt_userId", ["expiresAt", "userId"])
    .index("token", ["token"])
    .index("userId", ["userId"]),

  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    scope: v.optional(v.union(v.null(), v.string())),
    password: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("accountId", ["accountId"])
    .index("accountId_providerId", ["accountId", "providerId"])
    .index("providerId_userId", ["providerId", "userId"])
    .index("userId", ["userId"]),

  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("expiresAt", ["expiresAt"])
    .index("identifier", ["identifier"]),

  // organization plugin
  organization: defineTable({
    name: v.string(),
    slug: v.optional(v.union(v.null(), v.string())),
    logo: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    metadata: v.optional(v.union(v.null(), v.string())),
    // custom
    stripeCustomerId: v.optional(v.union(v.null(), v.string())),
    email: v.optional(v.union(v.null(), v.string())),
  })
    .index("slug", ["slug"])
    .index("name", ["name"])
    .index("stripeCustomerId", ["stripeCustomerId"])
    .index("createdAt", ["createdAt"]),

  member: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    teamId: v.optional(v.union(v.null(), v.string())),
  })
    .index("organizationId", ["organizationId"])
    .index("userId", ["userId"])
    .index("organizationId_userId", ["organizationId", "userId"]),

  invitation: defineTable({
    organizationId: v.string(),
    email: v.string(),
    role: v.optional(v.union(v.null(), v.string())),
    status: v.string(),
    expiresAt: v.number(),
    inviterId: v.string(),
    createdAt: v.number(),
    teamId: v.optional(v.union(v.null(), v.string())),
  })
    .index("organizationId", ["organizationId"])
    .index("organizationId_status", ["organizationId", "status"])
    .index("email", ["email"])
    .index("email_organizationId_status", ["email", "organizationId", "status"])
    .index("email_status", ["email", "status"]),

  // api-key plugin
  apikey: defineTable({
    configId: v.string(),
    name: v.optional(v.union(v.null(), v.string())),
    start: v.optional(v.union(v.null(), v.string())),
    referenceId: v.string(),
    prefix: v.optional(v.union(v.null(), v.string())),
    key: v.string(),
    refillInterval: v.optional(v.union(v.null(), v.number())),
    refillAmount: v.optional(v.union(v.null(), v.number())),
    lastRefillAt: v.optional(v.union(v.null(), v.number())),
    enabled: v.boolean(),
    rateLimitEnabled: v.boolean(),
    rateLimitTimeWindow: v.optional(v.union(v.null(), v.number())),
    rateLimitMax: v.optional(v.union(v.null(), v.number())),
    requestCount: v.number(),
    remaining: v.optional(v.union(v.null(), v.number())),
    lastRequest: v.optional(v.union(v.null(), v.number())),
    expiresAt: v.optional(v.union(v.null(), v.number())),
    createdAt: v.number(),
    updatedAt: v.number(),
    permissions: v.optional(v.union(v.null(), v.string())),
    metadata: v.optional(v.union(v.null(), v.string())),
  })
    .index("configId", ["configId"])
    .index("referenceId", ["referenceId"])
    .index("referenceId_createdAt", ["referenceId", "createdAt"])
    .index("key", ["key"]),

  // jwks for auth config
  jwks: defineTable({
    publicKey: v.string(),
    privateKey: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.union(v.null(), v.number())),
    alg: v.optional(v.union(v.null(), v.string())),
    crv: v.optional(v.union(v.null(), v.string())),
  }),

  // rate limit
  rateLimit: defineTable({
    key: v.string(),
    count: v.number(),
    lastRequest: v.number(),
  }).index("key", ["key"]),
};

export default defineSchema(tables);
