import {
  DEFAULT_REFERRAL_SETTINGS,
  REFERRAL_CODE_REGEX,
} from "./referral.constants";

export async function getReferralCookieConfig(code: string) {
  const normalizedCode = code.trim().toUpperCase();

  if (!REFERRAL_CODE_REGEX.test(normalizedCode)) {
    return null;
  }

  return {
    code: normalizedCode,
    maxAgeSeconds: DEFAULT_REFERRAL_SETTINGS.cookieExpiryDays * 24 * 60 * 60,
  };
}
