export const links = {
  signUp: "/signin?intent=signup&step=email",
  signIn: "/signin?intent=signin&step=email",
  upgrade: "/upgrade",
  ios: "/ios",
  extensions: "https://saveit.now/extensions",
  docs: "/docs",
} as const;

export const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Promise", href: "#promise" },
  { label: "iOS", href: "#ios" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;
