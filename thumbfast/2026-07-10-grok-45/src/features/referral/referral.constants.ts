export const REFERRAL_SETTINGS_ID = "default";
export const REFERRAL_COOKIE_NAME = "thumbfast_referral";

export const DEFAULT_REFERRAL_SETTINGS = {
  creditsPerReferral: 1,
  dailyCreditCap: 5,
  monthlyCreditCap: 30,
  cookieExpiryDays: 30,
  pendingExpiryDays: 7,
  requireProductAction: true,
  burstSignupThreshold: 5,
  sameIpSignupThreshold: 3,
} as const;

export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_REGEX = /^[A-Z2-9]{6,16}$/;

export const REFERRAL_BURST_WINDOW_MS = 60 * 60 * 1000;
export const REFERRAL_REVERSAL_WINDOW_MS = 24 * 60 * 60 * 1000;
