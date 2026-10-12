import type { Contact } from "./types";

export const ME: Contact = { name: "Avery Chen", email: "avery@lumenlabs.io" };

export type ContactKind = "work" | "client" | "personal" | "service";

export const PEOPLE: Record<string, Contact & { kind: ContactKind; title?: string }> = {
  maya: { name: "Maya Patel", email: "maya.patel@lumenlabs.io", kind: "work", title: "Engineering Manager" },
  jordan: { name: "Jordan Brooks", email: "jordan@lumenlabs.io", kind: "work", title: "Staff Engineer" },
  priya: { name: "Priya Raman", email: "priya@lumenlabs.io", kind: "work", title: "Design Lead" },
  diego: { name: "Diego Alvarez", email: "diego@lumenlabs.io", kind: "work", title: "Backend Engineer" },
  hannah: { name: "Hannah Kim", email: "hannah@lumenlabs.io", kind: "work", title: "CEO" },
  leo: { name: "Leo Martin", email: "leo.martin@lumenlabs.io", kind: "work", title: "Head of Marketing" },
  sofia: { name: "Sofia Rossi", email: "sofia@lumenlabs.io", kind: "work", title: "Data Scientist" },
  tom: { name: "Tom Becker", email: "tom.becker@lumenlabs.io", kind: "work", title: "Finance & Ops" },
  kai: { name: "Kai Tanaka", email: "kai@lumenlabs.io", kind: "work", title: "Product Designer" },
  people: { name: "Lumen People Team", email: "people@lumenlabs.io", kind: "service" },
  it: { name: "Lumen IT", email: "it-help@lumenlabs.io", kind: "service" },
  calendar: { name: "Priya Raman (via Calendar)", email: "calendar-notification@lumenlabs.io", kind: "service" },

  rachel: { name: "Rachel Nguyen", email: "rachel@brightpathhealth.com", kind: "client", title: "VP Product, Brightpath" },
  marcus: { name: "Marcus Webb", email: "marcus@webbventures.vc", kind: "client", title: "Partner, Webb Ventures" },
  elena: { name: "Elena Vasquez", email: "elena@studio-orbit.design", kind: "client", title: "Illustrator" },
  sam: { name: "Sam Okafor", email: "sam.okafor@talentbridge.co", kind: "client", title: "Recruiter" },

  mom: { name: "Linda Chen", email: "linda.chen58@mailbox.org", kind: "personal" },
  ethan: { name: "Ethan Chen", email: "ethanchen@fastmail.com", kind: "personal" },
  nora: { name: "Nora Fitzgerald", email: "nora.fitz@proton.me", kind: "personal" },
  ben: { name: "Ben Adeyemi", email: "ben.adeyemi@icloud.com", kind: "personal" },
  jess: { name: "Jess Moreno", email: "jess.moreno@outlook.com", kind: "personal" },
  greg: { name: "Greg Paulson", email: "greg@paulsonproperties.com", kind: "personal" },
  dental: { name: "Riverside Dental", email: "appointments@riversidedental.com", kind: "service" },
  vet: { name: "Maple Street Vet", email: "hello@maplestreetvet.com", kind: "service" },

  pixelhub: { name: "Pixelhub", email: "notifications@pixelhub.dev", kind: "service" },
  groundwork: { name: "Groundwork", email: "notify@groundwork.app", kind: "service" },
  framewise: { name: "Framewise", email: "no-reply@framewise.com", kind: "service" },
  harbor: { name: "Harbor Bank", email: "alerts@harborbank.com", kind: "service" },
  skyline: { name: "Skyline Airways", email: "itinerary@skylineairways.com", kind: "service" },
  skylineDeals: { name: "Skyline Airways", email: "deals@skylineairways.com", kind: "service" },
  wren: { name: "The Wren Lisbon", email: "reservations@thewrenlisbon.pt", kind: "service" },
  parcel: { name: "Parcel & Co", email: "orders@parcelandco.com", kind: "service" },
  swiftship: { name: "SwiftShip", email: "tracking@swiftship.com", kind: "service" },
  brightwater: { name: "Brightwater Energy", email: "billing@brightwater-energy.com", kind: "service" },
  cloudvault: { name: "CloudVault", email: "storage@cloudvault.io", kind: "service" },
  accounts: { name: "Lumen Accounts", email: "no-reply@accounts.lumenlabs.io", kind: "service" },
  glide: { name: "Glide", email: "receipts@glide.ride", kind: "service" },
  forkful: { name: "Forkful", email: "hello@forkful.com", kind: "service" },
  morningbyte: { name: "The Morning Byte", email: "newsletter@morningbyte.news", kind: "service" },
  designweekly: { name: "Design Weekly", email: "digest@designweekly.co", kind: "service" },
  passport: { name: "Passport Services", email: "no-reply@passports.gov.example", kind: "service" },
  summit: { name: "Product Summit", email: "speakers@productsummit.io", kind: "service" },

  trailhead: { name: "Trailhead Outfitters", email: "deals@trailheadoutfitters.com", kind: "service" },
  bean: { name: "Bean & Barrel", email: "hello@beanandbarrel.coffee", kind: "service" },
  lumiere: { name: "Lumière Cinemas", email: "members@lumierecinemas.com", kind: "service" },
  nordhaus: { name: "Nordhaus Home", email: "offers@nordhaus.home", kind: "service" },
  paperback: { name: "Paperback Club", email: "club@paperback.club", kind: "service" },
  tempo: { name: "Tempo", email: "no-reply@tempo.fm", kind: "service" },
  streambox: { name: "StreamBox", email: "billing@streambox.tv", kind: "service" },

  connectly: { name: "Connectly", email: "messages-noreply@connectly.com", kind: "service" },
  circle: { name: "Circle", email: "notify@circle.social", kind: "service" },
  gather: { name: "Gather Events", email: "events@gather.events", kind: "service" },
  stride: { name: "Stride", email: "no-reply@stride.run", kind: "service" },

  prize: { name: "Rewards Center", email: "winner@claim-reward-now.biz", kind: "service" },
  phish: { name: "Harbor Bank Security", email: "security@harb0rbank-verify.com", kind: "service" },
  crypto: { name: "Moonrise Capital", email: "alpha@moonrise-capital.xyz", kind: "service" },
};

export function isHuman(email: string) {
  const p = Object.values(PEOPLE).find((c) => c.email === email);
  return !!p && p.kind !== "service";
}

export function contactKind(email: string): ContactKind | undefined {
  return Object.values(PEOPLE).find((c) => c.email === email)?.kind;
}
