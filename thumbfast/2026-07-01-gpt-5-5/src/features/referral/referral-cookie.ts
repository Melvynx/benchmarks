import {
  DEFAULT_REFERRAL_SETTINGS,
  REFERRAL_COOKIE_NAME,
} from "./referral.constants";

const REFERRAL_CODE_PATTERN = /^[A-Z0-9_-]{4,32}$/i;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(1, maxAgeDays) * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function normalizeReferralCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase();
  return code && REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

export function getStoredReferralCode() {
  return normalizeReferralCode(readCookie(REFERRAL_COOKIE_NAME));
}

export function storeReferralCode(value: string) {
  const code = normalizeReferralCode(value);
  if (!code) return null;
  writeCookie(
    REFERRAL_COOKIE_NAME,
    code,
    DEFAULT_REFERRAL_SETTINGS.cookieExpiryDays,
  );
  return code;
}
