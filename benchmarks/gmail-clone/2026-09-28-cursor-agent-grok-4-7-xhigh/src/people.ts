import type { Person } from "./types";

export const ME: Person = { name: "Alex Chen", email: "alex.chen@grokmail.app" };

export const P = {
  maya: { name: "Maya Ellison", email: "maya.ellison@northwind.co" },
  jordan: { name: "Jordan Hale", email: "jordan.hale@northwind.co" },
  priya: { name: "Priya Raman", email: "priya.raman@northwind.co" },
  sam: { name: "Sam Ortega", email: "sam.ortega@northwind.co" },
  riley: { name: "Riley Okonkwo", email: "riley@fieldguide.io" },
  helen: { name: "Helen Chen", email: "helen.chen@gmail.com" },
  noah: { name: "Noah Berg", email: "noah.berg@northwind.co" },
  leah: { name: "Leah Okada", email: "leah.okada@northwind.co" },
  stripe: { name: "Stripe Receipts", email: "receipts@stripe.com" },
  united: { name: "United Airlines", email: "unitedairlines@united.com" },
  github: { name: "GitHub", email: "notifications@github.com" },
  figma: { name: "Figma", email: "comments-noreply@figma.com" },
  vercel: { name: "Vercel", email: "notifications@vercel.com" },
  linkedin: { name: "LinkedIn", email: "messages-noreply@linkedin.com" },
  amazon: { name: "Amazon.com", email: "auto-confirm@amazon.com" },
  notion: { name: "Notion", email: "notify@mail.notion.so" },
  slack: { name: "Slack", email: "notification@slack.com" },
  linear: { name: "Linear", email: "updates@linear.app" },
  elena: { name: "Elena Voss", email: "elena.voss@firstmark.example" },
  bank: { name: "Harbor Credit Union", email: "alerts@harborcu.example" },
  david: { name: "David Cho", email: "dcho@parkandcho.example" },
  signals: { name: "Dense Signals", email: "hello@densesignals.example" },
  ph: { name: "Product Hunt", email: "hello@producthunt.com" },
  cal: { name: "Calendar", email: "calendar-notification@google.com" },
  tax: { name: "Pilot Tax", email: "docs@pilottax.example" },
  domains: { name: "Namecheap", email: "support@namecheap.com" },
  spam1: { name: "Crypto Rewards", email: "winner@airdrop-claim.example" },
  spam2: { name: "IT Support Desk", email: "helpdesk@northwind-secure.example" },
  conf: { name: "Config", email: "tickets@config.example" },
  tess: { name: "Tess Morgan", email: "tess@lumenrecruit.example" },
  security: { name: "Northwind Security", email: "security@northwind.co" },
} satisfies Record<string, Person>;

export const DIRECTORY: Person[] = [
  ME,
  ...Object.values(P),
  { name: "Chris Adeyemi", email: "chris.adeyemi@northwind.co" },
  { name: "Ines Moreau", email: "ines.moreau@northwind.co" },
  { name: "Owen Park", email: "owen.park@northwind.co" },
];
