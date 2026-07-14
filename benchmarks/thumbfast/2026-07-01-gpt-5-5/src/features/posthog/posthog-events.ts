export const POSTHOG_EVENTS = {
  // Auth
  AUTH_SIGNUP_STARTED: "auth:signup_started",
  AUTH_SIGNIN_STARTED: "auth:signin_started",

  // Generation
  GENERATION_CREATED: "generation:created",
  GENERATION_REGENERATED: "generation:regenerated",
  GENERATION_CANCELLED: "generation:cancelled",
  GENERATION_ENHANCED: "generation:enhanced",

  // Billing
  BILLING_UPGRADE_INITIATED: "billing:upgrade_initiated",

  // Onboarding
  ONBOARDING_COMPLETED: "onboarding:completed",
  ONBOARDING_QUESTIONS_ANSWERED: "onboarding:questions_answered",

  // Content
  INSPIRATION_CREATED: "inspiration:created",
  INSPIRATION_ANONYMIZED: "inspiration:anonymized",
  PERSON_CREATED: "person:created",
  VIDEO_CREATED: "video:created",
  VIDEO_TITLES_GENERATED: "video:titles_generated",
  IMAGE_UPLOADED: "image:uploaded",

  // Engagement
  THUMBNAIL_DOWNLOADED: "thumbnail:downloaded",
  THUMBNAIL_COPIED: "thumbnail:copied",

  // Feedback
  FEEDBACK_SUBMITTED: "feedback:submitted",
} as const;

export type PostHogEvent = (typeof POSTHOG_EVENTS)[keyof typeof POSTHOG_EVENTS];
