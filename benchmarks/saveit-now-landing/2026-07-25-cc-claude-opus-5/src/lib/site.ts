/** Shared destinations and section ids, so nav and CTAs never drift apart. */

export const APP_URL = "https://saveit.now";

export const SIGN_UP_URL = `${APP_URL}/signin?intent=signup&step=email`;
export const SIGN_IN_URL = `${APP_URL}/signin?intent=signin&step=email`;
export const EXTENSIONS_URL = `${APP_URL}/extensions`;
export const IOS_URL = `${APP_URL}/ios`;
export const CONTACT_EMAIL = "hi@saveit.now";

/** Sections the header tracks and scrolls to, in page order. */
export const NAV_SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "promise", label: "The promise" },
  { id: "ios", label: "iOS" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
] as const;
