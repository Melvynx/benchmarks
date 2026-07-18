type AuthRecord = Record<string, unknown> & {
  _id?: string;
  id?: string;
};

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" ? value : fallback;

const booleanValue = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export const authId = (record: AuthRecord) =>
  String(record.id ?? record._id ?? "");

export function toAdminUser(record: AuthRecord) {
  return {
    id: authId(record),
    name: stringValue(record.name),
    email: stringValue(record.email),
    image: typeof record.image === "string" ? record.image : null,
    role: stringValue(record.role, "user"),
    banned: booleanValue(record.banned),
    banReason: typeof record.banReason === "string" ? record.banReason : null,
    emailVerified: booleanValue(record.emailVerified),
    createdAt: numberValue(record.createdAt),
    updatedAt: numberValue(record.updatedAt),
  };
}

export function toAdminOrganization(record: AuthRecord) {
  return {
    id: authId(record),
    name: stringValue(record.name, "Untitled organization"),
    slug: stringValue(record.slug),
    logo: typeof record.logo === "string" ? record.logo : null,
    stripeCustomerId:
      typeof record.stripeCustomerId === "string"
        ? record.stripeCustomerId
        : null,
    createdAt: numberValue(record.createdAt),
    metadata: typeof record.metadata === "string" ? record.metadata : null,
  };
}

export function toAdminMember(
  member: AuthRecord,
  user: AuthRecord | null | undefined,
) {
  return {
    id: authId(member),
    userId: stringValue(member.userId),
    organizationId: stringValue(member.organizationId),
    role: stringValue(member.role, "member"),
    createdAt: numberValue(member.createdAt),
    user: user ? toAdminUser(user) : null,
  };
}

export function toAdminInvitation(record: AuthRecord) {
  return {
    id: authId(record),
    email: stringValue(record.email),
    role: stringValue(record.role, "member"),
    status: stringValue(record.status, "pending"),
    organizationId: stringValue(record.organizationId),
    expiresAt: numberValue(record.expiresAt),
    createdAt: numberValue(record.createdAt),
  };
}

export function toAdminAccount(record: AuthRecord) {
  return {
    id: authId(record),
    providerId: stringValue(record.providerId),
    accountId: stringValue(record.accountId),
    createdAt: numberValue(record.createdAt),
    updatedAt: numberValue(record.updatedAt),
  };
}

export function toAdminSession(record: AuthRecord) {
  return {
    id: authId(record),
    token: stringValue(record.token),
    ipAddress: typeof record.ipAddress === "string" ? record.ipAddress : null,
    userAgent: typeof record.userAgent === "string" ? record.userAgent : null,
    expiresAt:
      record.expiresAt instanceof Date
        ? record.expiresAt.getTime()
        : numberValue(record.expiresAt),
    createdAt: numberValue(record.createdAt),
    updatedAt: numberValue(record.updatedAt),
  };
}
