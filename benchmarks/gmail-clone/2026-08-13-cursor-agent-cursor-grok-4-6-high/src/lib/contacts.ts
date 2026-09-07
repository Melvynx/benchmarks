import type { Account, Contact } from './types'

export const ME: Account = {
  name: 'Jordan Hale',
  email: 'jordan.hale@northline.io',
  hue: 214,
  storageUsedGb: 6.4,
  storageTotalGb: 15,
}

export const CONTACTS: Contact[] = [
  { id: 'me', name: ME.name, email: ME.email, hue: ME.hue, title: 'Product, Northline' },
  { id: 'priya', name: 'Priya Mehta', email: 'priya.mehta@northline.io', hue: 168, title: 'Head of Product' },
  { id: 'sam', name: 'Sam Okonkwo', email: 'sam.okonkwo@northline.io', hue: 24, title: 'Staff Engineer' },
  { id: 'elena', name: 'Elena Voss', email: 'elena.voss@northline.io', hue: 332, title: 'Design Lead' },
  { id: 'marcus', name: 'Marcus Chen', email: 'marcus.chen@northline.io', hue: 262, title: 'CEO' },
  { id: 'aisha', name: 'Aisha Rahman', email: 'aisha.rahman@northline.io', hue: 12, title: 'People Partner' },
  { id: 'theo', name: 'Theo Lang', email: 'theo.lang@northline.io', hue: 198, title: 'Account Executive' },
  { id: 'nora', name: 'Nora Patel', email: 'nora.patel@northline.io', hue: 48, title: 'General Counsel' },
  { id: 'jules', name: 'Jules Park', email: 'jules.park@northline.io', hue: 142, title: 'Brand' },
  { id: 'ren', name: 'Ren Alvarez', email: 'ren.alvarez@northline.io', hue: 286, title: 'Support Lead' },
  { id: 'mina', name: 'Mina Cho', email: 'mina.cho@northline.io', hue: 88, title: 'Data' },
  { id: 'owen', name: 'Owen Blake', email: 'owen.blake@harborand.co', hue: 210, title: 'VP Ops, Harbor & Co' },
  { id: 'lina', name: 'Lina Ortega', email: 'lina@kitefield.studio', hue: 18, title: 'Founder, Kitefield' },
  { id: 'dev', name: 'Dev Rel', email: 'hello@linear.app', hue: 250, title: 'Linear' },
  { id: 'gh', name: 'GitHub', email: 'notifications@github.com', hue: 0, title: 'GitHub' },
  { id: 'figma', name: 'Figma', email: 'team@figma.com', hue: 280 },
  { id: 'stripe', name: 'Stripe', email: 'receipts@stripe.com', hue: 230 },
  { id: 'notion', name: 'Notion', email: 'team@makenotion.com', hue: 40 },
  { id: 'linkedin', name: 'LinkedIn', email: 'messages-noreply@linkedin.com', hue: 201 },
  { id: 'x', name: 'X', email: 'info@x.com', hue: 0 },
  { id: 'spotify', name: 'Spotify', email: 'no-reply@spotify.com', hue: 141 },
  { id: 'uber', name: 'Uber Receipts', email: 'uber.receipts@uber.com', hue: 0 },
  { id: 'delta', name: 'Delta Air Lines', email: 'deltaairlines@delta.com', hue: 354 },
  { id: 'amex', name: 'American Express', email: 'americanexpress@welcome.americanexpress.com', hue: 210 },
  { id: 'nytimes', name: 'The New York Times', email: 'nytdirect@nytimes.com', hue: 0 },
  { id: 'substack', name: 'Stratechery', email: 'ben@stratechery.com', hue: 20 },
  { id: 'calendar', name: 'Calendar', email: 'calendar-notification@google.com', hue: 214 },
  { id: 'dribbble', name: 'Dribbble', email: 'hello@dribbble.com', hue: 350 },
  { id: 'aws', name: 'Amazon Web Services', email: 'no-reply@amazon.com', hue: 32 },
  { id: 'spam1', name: 'Prize Desk', email: 'winner@prize-desk.biz', hue: 40 },
  { id: 'mom', name: 'Helen Hale', email: 'helen.hale@gmail.com', hue: 310, title: 'Family' },
  { id: 'ada', name: 'Ada Okonkwo', email: 'ada.okonkwo@gmail.com', hue: 160 },
]

const byEmail = new Map(CONTACTS.map((c) => [c.email.toLowerCase(), c]))

export function contactByEmail(email: string): Contact {
  const hit = byEmail.get(email.toLowerCase())
  if (hit) return hit
  const local = email.split('@')[0] ?? email
  const name = local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  let hue = 0
  for (let i = 0; i < email.length; i++) hue = (hue + email.charCodeAt(i) * 17) % 360
  return { id: email, name, email, hue }
}

export function displayName(email: string): string {
  return contactByEmail(email).name
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function avatarColor(hue: number): string {
  return `oklch(0.55 0.14 ${hue})`
}
