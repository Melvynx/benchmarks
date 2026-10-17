import type { Contact } from "../types";

export const ME: Contact = {
  name: "Sam Carter",
  email: "sam.carter@northwind.dev",
  color: "#d97757",
  kind: "person",
  org: "Northwind",
  title: "Senior Product Engineer",
};

const p = (name: string, email: string, color: string, org?: string, title?: string): Contact => ({
  name,
  email,
  color,
  kind: "person",
  org,
  title,
});
const s = (name: string, email: string, color: string): Contact => ({ name, email, color, kind: "service" });

export const CONTACTS: Contact[] = [
  ME,
  p("Priya Natarajan", "priya@northwind.dev", "#1a73e8", "Northwind", "Engineering Manager"),
  p("Marcus Chen", "marcus.chen@northwind.dev", "#0b8043", "Northwind", "Product Designer"),
  p("Elena Petrova", "elena@northwind.dev", "#8e24aa", "Northwind", "Product Manager"),
  p("Diego Alvarez", "diego.alvarez@northwind.dev", "#e8710a", "Northwind", "Staff Engineer"),
  p("Aisha Bello", "aisha@northwind.dev", "#c5221f", "Northwind", "Head of Data"),
  p("Tom Becker", "tom.becker@northwind.dev", "#5f6368", "Northwind", "IT & Ops"),
  p("Hannah Kim", "hannah.kim@lumen-talent.com", "#d01884", "Lumen Talent", "Technical Recruiter"),
  p("Theo Bennett", "theo.bennett@gmail.com", "#12b5cb", undefined, "Friend"),
  p("Linda Carter", "linda.carter52@gmail.com", "#f4511e", undefined, "Mom"),
  p("Jules Carter", "jules.carter@icloud.com", "#7cb342", undefined, "Sister"),
  p("Noah Fischer", "noah@fischer-studio.de", "#3949ab", "Fischer Studio", "Founder"),
  p("Rachel Osei", "rachel.osei@acmecorp.com", "#00897b", "Acme Corp", "VP Engineering"),
  p("Kenji Watanabe", "kenji@watanabe.jp", "#6d4c41", undefined, "Climbing buddy"),
  p("Dr. Maya Lin", "appointments@brightsmile-dental.com", "#039be5", "BrightSmile Dental"),
  p("Oliver Grant", "oliver.grant@hearthhomes.com", "#795548", "Hearth Homes", "Landlord"),
  s("GitHub", "notifications@github.com", "#24292f"),
  s("Linear", "notifications@linear.app", "#5e6ad2"),
  s("Figma", "no-reply@figma.com", "#a259ff"),
  s("Vercel", "notifications@vercel.com", "#000000"),
  s("Stripe", "receipts@stripe.com", "#635bff"),
  s("Notion", "notify@mail.notion.so", "#37352f"),
  s("Google Calendar", "calendar-notification@google.com", "#1a73e8"),
  s("Delta Air Lines", "deltaairlines@t.delta.com", "#c01933"),
  s("Airbnb", "automated@airbnb.com", "#ff385c"),
  s("Amazon", "shipment-tracking@amazon.com", "#ff9900"),
  s("Uber Receipts", "noreply@uber.com", "#000000"),
  s("Chase", "no.reply.alerts@chase.com", "#117aca"),
  s("Spotify", "no-reply@spotify.com", "#1db954"),
  s("LinkedIn", "messages-noreply@linkedin.com", "#0a66c2"),
  s("X", "info@x.com", "#0f1419"),
  s("Strava", "no-reply@strava.com", "#fc4c02"),
  s("Meetup", "info@meetup.com", "#f65858"),
  s("Lenny's Newsletter", "lenny@substack.com", "#ff6719"),
  s("Stratechery", "email@stratechery.com", "#e1a33d"),
  s("Patagonia", "patagonia@email.patagonia.com", "#1f3a5f"),
  s("Allbirds", "hello@allbirds.com", "#212a2f"),
  s("DoorDash", "no-reply@doordash.com", "#ff3008"),
  s("REI Co-op", "rei@notices.rei.com", "#2e5c3c"),
  s("Apple", "no_reply@email.apple.com", "#555555"),
  s("Medium Daily Digest", "noreply@medium.com", "#000000"),
  s("Duolingo", "hello@duolingo.com", "#58cc02"),
  s("Coinbase Security", "security@c0inbase-alerts.net", "#b00020"),
  s("Prize Center", "winner@claim-rewards.biz", "#b00020"),
  s("Dr. Felix Adebayo", "felix.adebayo@consultant-mail.org", "#b00020"),
];

const byEmail = new Map(CONTACTS.map((c) => [c.email.toLowerCase(), c]));

const palette = ["#1a73e8", "#0b8043", "#8e24aa", "#e8710a", "#c5221f", "#12b5cb", "#d01884", "#3949ab", "#00897b", "#6d4c41"];

export function contactFor(email: string, extra: Contact[] = []): Contact {
  const key = email.toLowerCase();
  const found = byEmail.get(key) ?? extra.find((c) => c.email.toLowerCase() === key);
  if (found) return found;
  const local = email.split("@")[0] ?? email;
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { name: name || email, email, color: palette[h % palette.length], kind: "person" };
}

export const isMe = (email: string) => email.toLowerCase() === ME.email;
