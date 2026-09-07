import type { Address } from '@/lib/types'

export const ME: Address = { name: 'Avery Chen', email: 'avery.chen@meridian.io' }

interface PersonSeed extends Address {
  title?: string
  company?: string
  rank?: number
}

/**
 * Every address the mailbox knows about, keyed by a short handle used throughout
 * the thread seeds. Ranks bias the composer's autocomplete toward real coworkers.
 */
export const PEOPLE = {
  me: { ...ME, title: 'Product Engineering', company: 'Meridian', rank: 100 },

  /* ---- Meridian coworkers ---- */
  priya: {
    name: 'Priya Raghavan',
    email: 'priya@meridian.io',
    title: 'Head of Design',
    company: 'Meridian',
    rank: 96,
  },
  tom: {
    name: 'Tom Okafor',
    email: 'tom.okafor@meridian.io',
    title: 'Staff Engineer',
    company: 'Meridian',
    rank: 94,
  },
  dana: {
    name: 'Dana Whitfield',
    email: 'dana@meridian.io',
    title: 'Chief Executive',
    company: 'Meridian',
    rank: 90,
  },
  luis: {
    name: 'Luis Ferrer',
    email: 'luis.ferrer@meridian.io',
    title: 'Product Manager',
    company: 'Meridian',
    rank: 92,
  },
  nina: {
    name: 'Nina Sokolova',
    email: 'nina.sokolova@meridian.io',
    title: 'Data Science',
    company: 'Meridian',
    rank: 84,
  },
  jae: {
    name: 'Jae-won Park',
    email: 'jaewon@meridian.io',
    title: 'Infrastructure',
    company: 'Meridian',
    rank: 82,
  },
  marcus: {
    name: 'Marcus Bell',
    email: 'marcus.bell@meridian.io',
    title: 'Support Lead',
    company: 'Meridian',
    rank: 78,
  },
  sofia: {
    name: 'Sofia Lindqvist',
    email: 'sofia@meridian.io',
    title: 'Talent',
    company: 'Meridian',
    rank: 74,
  },
  ravi: {
    name: 'Ravi Menon',
    email: 'ravi.menon@meridian.io',
    title: 'Security',
    company: 'Meridian',
    rank: 70,
  },
  eng: { name: 'Engineering', email: 'engineering@meridian.io', company: 'Meridian', rank: 60 },
  design: { name: 'Design Team', email: 'design@meridian.io', company: 'Meridian', rank: 58 },

  /* ---- Clients & partners ---- */
  harper: {
    name: 'Harper Ellis',
    email: 'harper.ellis@northwind.co',
    title: 'VP Operations',
    company: 'Northwind',
    rank: 66,
  },
  yusuf: {
    name: 'Yusuf Demir',
    email: 'y.demir@atlasfreight.com',
    title: 'CTO',
    company: 'Atlas Freight',
    rank: 62,
  },
  clara: {
    name: 'Clara Bennett',
    email: 'clara@bennett-legal.com',
    title: 'Counsel',
    company: 'Bennett Legal',
    rank: 55,
  },
  devon: {
    name: 'Devon Wright',
    email: 'devon@parallaxstudio.design',
    title: 'Founder',
    company: 'Parallax Studio',
    rank: 52,
  },

  /* ---- Personal ---- */
  mom: { name: 'Helen Chen', email: 'helen.chen58@gmail.com', rank: 88 },
  mei: { name: 'Mei Chen', email: 'mei.chen@hey.com', title: 'Sister', rank: 80 },
  jordan: { name: 'Jordan Reyes', email: 'jordanreyes@fastmail.com', rank: 76 },
  sam: { name: 'Sam Okonjo', email: 'sam.okonjo@proton.me', rank: 72 },
  climbing: { name: 'Basalt Climbing Club', email: 'crew@basaltclimbing.org', rank: 40 },

  /* ---- Services & brands ---- */
  github: { name: 'GitHub', email: 'notifications@github.com', rank: 30 },
  linear: { name: 'Linear', email: 'notifications@linear.app', rank: 28 },
  vercel: { name: 'Vercel', email: 'no-reply@vercel.com', rank: 26 },
  figma: { name: 'Figma', email: 'updates@figma.com', rank: 26 },
  stripe: { name: 'Stripe', email: 'receipts@stripe.com', rank: 24 },
  aws: { name: 'AWS Billing', email: 'no-reply@aws.amazon.com', rank: 22 },
  datadog: { name: 'Datadog Alerts', email: 'alerts@datadoghq.com', rank: 22 },
  calendar: { name: 'Meridian Calendar', email: 'calendar-notification@meridian.io', rank: 20 },
  slack: { name: 'Slack', email: 'feedback@slack.com', rank: 18 },
  linkedin: { name: 'LinkedIn', email: 'messages-noreply@linkedin.com', rank: 16 },
  notion: { name: 'Notion', email: 'team@makenotion.com', rank: 16 },
  onepassword: { name: '1Password', email: 'support@1password.com', rank: 18 },

  chase: { name: 'Meridian Credit Union', email: 'alerts@meridiancu.com', rank: 20 },
  delta: { name: 'Delta Air Lines', email: 'confirmations@delta.com', rank: 18 },
  airbnb: { name: 'Airbnb', email: 'automated@airbnb.com', rank: 16 },
  amazon: { name: 'Amazon.com', email: 'ship-confirm@amazon.com', rank: 14 },
  apple: { name: 'Apple', email: 'no_reply@email.apple.com', rank: 14 },
  spotify: { name: 'Spotify', email: 'no-reply@spotify.com', rank: 12 },
  patagonia: { name: 'Patagonia', email: 'news@patagonia.com', rank: 8 },
  allbirds: { name: 'Allbirds', email: 'hello@allbirds.com', rank: 6 },
  ritual: { name: 'Ritual Coffee', email: 'hi@ritualcoffee.co', rank: 6 },
  huckberry: { name: 'Huckberry', email: 'hello@huckberry.com', rank: 6 },

  stratechery: { name: 'Stratechery', email: 'ben@stratechery.com', rank: 10 },
  morningbrew: { name: 'Morning Brew', email: 'crew@morningbrew.com', rank: 8 },
  pragmatic: { name: 'The Pragmatic Engineer', email: 'gergely@pragmaticengineer.com', rank: 10 },
  nyt: { name: 'The New York Times', email: 'nytdirect@nytimes.com', rank: 8 },

  clinic: { name: 'Bay Ridge Dental', email: 'appointments@bayridgedental.com', rank: 12 },
  landlord: { name: 'Corinne Duval', email: 'corinne@duvalproperties.com', rank: 30 },
  school: { name: 'Fieldstone Pottery', email: 'studio@fieldstonepottery.com', rank: 10 },

  /* ---- Junk ---- */
  spam1: { name: 'Crypto Yield Pro', email: 'winner@cry-pto-yield.biz', rank: 0 },
  spam2: { name: 'Account Security', email: 'verify@secure-acct-update.info', rank: 0 },
} satisfies Record<string, PersonSeed>

export type PersonKey = keyof typeof PEOPLE

export function addr(key: PersonKey): Address {
  const p = PEOPLE[key]
  return { name: p.name, email: p.email }
}
