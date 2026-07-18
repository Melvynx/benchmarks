type StoredImage = {
  url: string;
  key?: string;
  width?: number;
  height?: number;
  contentType?: string;
};

type InspirationAccessRow = {
  organizationId: string;
  image?: StoredImage | string | null;
  images?: (StoredImage | string | null)[] | null;
  isPublic?: boolean | null;
  adminReview?: string | null;
  reviewedAt?: number | null;
  deletedAt?: number | null;
};

export const REVIEW_STATUS = {
  GOOD: "GOOD",
  APPROVED: "APPROVED",
  PENDING: "PENDING",
  DENY: "DENY",
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export const publicReviewStatusList = [
  REVIEW_STATUS.GOOD,
  REVIEW_STATUS.APPROVED,
] as const;

const publicReviewStatuses = new Set<ReviewStatus>(publicReviewStatusList);

export const communityReviewRank = {
  [REVIEW_STATUS.GOOD]: 0,
  [REVIEW_STATUS.APPROVED]: 1,
  [REVIEW_STATUS.PENDING]: 2,
  [REVIEW_STATUS.DENY]: 3,
} satisfies Record<ReviewStatus, number>;

export function getReviewStatus(
  inspiration: Pick<
    InspirationAccessRow,
    "adminReview" | "reviewedAt" | "deletedAt"
  >,
): ReviewStatus {
  if (
    inspiration.adminReview === REVIEW_STATUS.GOOD ||
    inspiration.adminReview === REVIEW_STATUS.APPROVED ||
    inspiration.adminReview === REVIEW_STATUS.PENDING ||
    inspiration.adminReview === REVIEW_STATUS.DENY
  ) {
    return inspiration.adminReview;
  }
  if (inspiration.deletedAt) return REVIEW_STATUS.DENY;
  if (inspiration.reviewedAt) return REVIEW_STATUS.APPROVED;
  return REVIEW_STATUS.PENDING;
}

export function canListInCommunity(inspiration: InspirationAccessRow) {
  return (
    !inspiration.deletedAt &&
    inspiration.isPublic !== false &&
    publicReviewStatuses.has(getReviewStatus(inspiration))
  );
}

export function canReadInspiration(
  inspiration: InspirationAccessRow,
  orgId: string,
) {
  if (inspiration.deletedAt) return false;

  return (
    inspiration.organizationId === orgId || canListInCommunity(inspiration)
  );
}

export function getInspirationStoredImages(inspiration: InspirationAccessRow) {
  const images =
    inspiration.images && inspiration.images.length > 0
      ? inspiration.images
      : inspiration.image
        ? [inspiration.image]
        : [];

  return images.flatMap((image): StoredImage[] => {
    if (!image) return [];
    if (typeof image === "string") return [{ url: image }];
    return image.url ? [image] : [];
  });
}

export function toStoredImageUrl(value: StoredImage | string | null) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.url;
}

export function getInspirationImageUrls(inspiration: InspirationAccessRow) {
  return getInspirationStoredImages(inspiration)
    .map(toStoredImageUrl)
    .filter((url): url is string => Boolean(url));
}

export function isAnonymizedImageUrl(url: string) {
  return /(?:^|[/?])anonymized-/i.test(url);
}

export function resolveHasPlaceholder(
  hasPlaceholder: boolean | undefined | null,
  thumbnailUrls: string[],
) {
  if (hasPlaceholder) return true;
  return thumbnailUrls.some(isAnonymizedImageUrl);
}
