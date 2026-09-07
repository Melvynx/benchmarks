import type { Account, Contact, Label } from './types'
import { hueOf } from './format'

export const ME: Account = {
  name: 'Maya Okonkwo',
  email: 'maya.okonkwo@gmail.com',
  hue: hueOf('maya.okonkwo@gmail.com'),
  storageUsedGb: 6.83,
  storageTotalGb: 15,
}

type Raw = [name: string, email: string, title?: string]

const RAW: Raw[] = [
  // ---------------------------------------------------------------- Orbit Labs
  ['Priya Raman', 'priya@orbitlabs.com', 'VP Engineering, Orbit Labs'],
  ['Daniel Osei', 'daniel.osei@orbitlabs.com', 'Staff Engineer, Orbit Labs'],
  ['Sofia Marchetti', 'sofia@orbitlabs.com', 'Design Lead, Orbit Labs'],
  ['Tom Lindqvist', 'tom@orbitlabs.com', 'CEO, Orbit Labs'],
  ['Grace Kim', 'grace.kim@orbitlabs.com', 'Product Manager, Orbit Labs'],
  ['Ben Adeyemi', 'ben@orbitlabs.com', 'Head of Support, Orbit Labs'],
  ['Nadia Haddad', 'nadia@orbitlabs.com', 'Data Science, Orbit Labs'],
  ['Marcus Webb', 'marcus.webb@orbitlabs.com', 'Account Executive, Orbit Labs'],
  ['Yuki Tanaka', 'yuki@orbitlabs.com', 'iOS Engineer, Orbit Labs'],
  ['Elena Petrova', 'elena.petrova@orbitlabs.com', 'People Ops, Orbit Labs'],
  ['Oliver Grant', 'oliver.grant@orbitlabs.com', 'Finance & Legal, Orbit Labs'],
  ['Orbit Design Crit', 'design-crit@orbitlabs.com'],
  ['Orbit Engineering', 'eng-all@orbitlabs.com'],
  // ------------------------------------------------------------------ external
  ['Jordan Blake', 'jordan@meridianretail.com', 'Director of Ops, Meridian Retail'],
  ['Clara Nunes', 'clara.nunes@brightpath.io', 'Partnerships, Brightpath'],
  ['Hassan Ali', 'hassan@ali-consulting.com', 'Principal, Ali Consulting'],
  ['Rachel Stein', 'rachel@northstar.vc', 'Partner, Northstar Ventures'],
  ['Ibrahim Diallo', 'ibrahim@fintrace.co', 'CTO, Fintrace'],
  ['Wei Zhang', 'wei.zhang@cartography.dev', 'Founder, Cartography'],
  ['Hannah Voss', 'hannah@northbeam-talent.com', 'Technical Recruiter, Northbeam'],
  ['Kevin Zhao', 'kzhao@lattice-search.com', 'Partner, Lattice Search'],
  // ------------------------------------------------------------------ personal
  ['Mum', 'adaeze.okonkwo@gmail.com'],
  ['Chidi Okonkwo', 'chidi.ok@gmail.com'],
  ['Léa Dubois', 'lea.dubois@gmail.com'],
  ['Sam Whitfield', 'sam.whitfield@hey.com'],
  ['Tessa Bright', 'tessa.bright@gmail.com'],
  ['Bramble Vet Clinic', 'appointments@bramblevet.co.uk'],
  ['Fielding Property', 'lettings@fieldingproperty.co.uk'],
  // ------------------------------------------------------------------ services
  ['GitHub', 'notifications@github.com'],
  ['Linear', 'notifications@linear.app'],
  ['Vercel', 'no-reply@vercel.com'],
  ['Stripe', 'receipts@stripe.com'],
  ['Figma', 'no-reply@figma.com'],
  ['Notion', 'team@makenotion.com'],
  ['1Password', 'no-reply@1password.com'],
  ['Google', 'no-reply@accounts.google.com'],
  ['Sentry', 'alerts@sentry.io'],
  ['Skyward Airlines', 'itinerary@skywardair.com'],
  ['Kestrel Hotels', 'reservations@kestrelhotels.com'],
  ['Northline', 'orders@northline.com'],
  ['Ledger', 'team@ledger.finance'],
  ['Monzo', 'no-reply@monzo.com'],
  // ---------------------------------------------------------------- promotions
  ['Kinfolk Supply', 'hello@kinfolksupply.com'],
  ['Rook Coffee', 'brew@rookcoffee.co'],
  ['Strider', 'news@strider.com'],
  ['Config 2026', 'events@figma.com'],
  ['The Interface', 'letters@theinterface.email'],
  ['Dense Discovery', 'hello@densediscovery.com'],
  // -------------------------------------------------------------------- social
  ['LinkedIn', 'notifications@linkedin.com'],
  ['Tempo', 'no-reply@tempo.run'],
  ['Discord', 'noreply@discord.com'],
  ['Dribbble', 'digest@dribbble.com'],
  // -------------------------------------------------------------------- forums
  ['Design Systems Club', 'design-systems@googlegroups.com'],
  ['React Weekly', 'digest@reactweekly.dev'],
  // ---------------------------------------------------------------------- spam
  ['CRYPTO REWARDS DEPT', 'winner@luxe-rewards-claim.biz'],
  ['Mrs. Beatrice Holloway', 'b.holloway991@barrister-trust.net'],
]

export const CONTACTS: Contact[] = RAW.map(([name, email, title]) => ({
  id: email,
  name,
  email,
  hue: hueOf(email),
  title,
}))

export const ME_CONTACT: Contact = {
  id: ME.email,
  name: ME.name,
  email: ME.email,
  hue: ME.hue,
  title: 'Director of Product, Orbit Labs',
}

export const CONTACT_INDEX: Record<string, Contact> = Object.fromEntries(
  [...CONTACTS, ME_CONTACT].map((c) => [c.email, c]),
)

/** Falls back to an address-only contact so hand-typed recipients still render. */
export function resolveContact(email: string): Contact {
  const hit = CONTACT_INDEX[email]
  if (hit) return hit
  const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  return { id: email, name, email, hue: hueOf(email) }
}

export const SEED_LABELS: Label[] = [
  { id: 'lbl_work', name: 'Work', color: '#1a73e8', visible: true },
  { id: 'lbl_design', name: 'Design', color: '#8430ce', visible: true },
  { id: 'lbl_hiring', name: 'Hiring', color: '#d01884', visible: true },
  { id: 'lbl_travel', name: 'Travel', color: '#00838f', visible: true },
  { id: 'lbl_receipts', name: 'Receipts', color: '#188038', visible: true },
  { id: 'lbl_family', name: 'Family', color: '#e8710a', visible: true },
  { id: 'lbl_followup', name: 'Follow up', color: '#d93025', visible: true },
  { id: 'lbl_reading', name: 'Reading list', color: '#5f6368', visible: true },
]
