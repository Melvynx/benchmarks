/**
 * Every destination on the page.
 *
 * This app is the landing page in isolation, so product routes point at the
 * live site rather than at paths that would 404 here. Section links stay as
 * in-page anchors.
 */

const SITE = "https://saveit.now";

export const LINKS = {
  signUp: `${SITE}/signin?intent=signup&step=email`,
  signIn: `${SITE}/signin?intent=signin&step=email`,
  upgrade: `${SITE}/upgrade`,
  extensions: `${SITE}/extensions`,
  ios: `${SITE}/ios`,
  docs: `${SITE}/docs`,
  blog: `${SITE}/posts`,
  changelog: `${SITE}/changelog`,
  tools: `${SITE}/tools`,
  about: `${SITE}/about`,
  contact: `${SITE}/contact`,
  privacy: `${SITE}/privacy`,
  terms: `${SITE}/terms`,
  twitter: "https://twitter.com/saveitnow",
} as const;

/** Anchors used by both the header nav and the footer. */
export const SECTIONS = [
  { id: "workflow", label: "How it works" },
  { id: "promise", label: "The promise" },
  { id: "ios", label: "iOS" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
] as const;
