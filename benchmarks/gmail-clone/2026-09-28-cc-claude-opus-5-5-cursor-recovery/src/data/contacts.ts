import type { Contact } from '../types'

export const ME: Contact = { name: 'Sam Rivera', email: 'sam.rivera@lumenlabs.io' }

const c = (name: string, email: string): Contact => ({ name, email })

export const P = {
  priya: c('Priya Shah', 'priya.shah@lumenlabs.io'),
  marcus: c('Marcus Chen', 'marcus.chen@lumenlabs.io'),
  elena: c('Elena García', 'elena.garcia@lumenlabs.io'),
  tom: c('Tom Becker', 'tom.becker@lumenlabs.io'),
  aisha: c('Aisha Bello', 'aisha.bello@lumenlabs.io'),
  jonas: c('Jonas Weber', 'jonas.weber@lumenlabs.io'),
  hana: c('Hana Kim', 'hana.kim@lumenlabs.io'),
  diego: c('Diego Alvarez', 'diego@alvarez-legal.com'),
  mom: c('Linda Rivera', 'linda.rivera@fastmail.com'),
  chris: c('Chris Rivera', 'chris.rivera@outlook.com'),
  maya: c('Maya Patel', 'maya.patel@gmail.com'),
  leo: c('Leo Martins', 'leo.martins@protonmail.com'),
  nora: c('Nora Lindqvist', 'nora@northwind.vc'),
  ben: c('Ben Okafor', 'ben.okafor@halcyon.design'),
  rachel: c('Rachel Stone', 'rachel@stonearchitects.co'),
  kenji: c('Kenji Watanabe', 'kenji.w@orbit-analytics.com'),
  // services
  github: c('GitHub', 'notifications@github.com'),
  figma: c('Figma', 'no-reply@figma.com'),
  linear: c('Linear', 'notifications@linear.app'),
  stripe: c('Stripe', 'receipts@stripe.com'),
  skyward: c('Skyward Airlines', 'itinerary@skywardair.com'),
  northbank: c('Northbank', 'alerts@northbank.com'),
  harbor: c('Harbor & Pine', 'hello@harborandpine.com'),
  fieldnotes: c('Fieldnotes Weekly', 'digest@fieldnotes.news'),
  linkedin: c('LinkedIn', 'messages-noreply@linkedin.com'),
  meetup: c('Meetup', 'info@meetup.com'),
  staybnb: c('Staybnb', 'automated@staybnb.com'),
  calendar: c('Google Calendar', 'calendar-notification@google.com'),
  notion: c('Notion Team', 'team@makenotion.com'),
  loop: c('Loop Rides', 'receipts@looprides.com'),
  bookshop: c('Bramble Books', 'orders@bramblebooks.com'),
  grocer: c('FreshCrate', 'hello@freshcrate.com'),
  strava: c('Strava', 'no-reply@strava.com'),
  vercel: c('Vercel', 'notifications@vercel.com'),
  newsletter: c('The Pragmatic Engineer', 'pragmatic@substack.com'),
  cinema: c('Rialto Cinemas', 'tickets@rialto.film'),
  spam1: c('Crypto Profit Desk', 'winner@cryptoprofit-desk.biz'),
  spam2: c('Pharmacy Direct', 'deals@pharma-direct-now.ru'),
}

/** People you can autocomplete to (exclude no-reply style senders) */
export const ADDRESS_BOOK: Contact[] = [
  P.priya, P.marcus, P.elena, P.tom, P.aisha, P.jonas, P.hana, P.diego, P.mom, P.chris,
  P.maya, P.leo, P.nora, P.ben, P.rachel, P.kenji,
  { name: 'Olivia Grant', email: 'olivia.grant@lumenlabs.io' },
  { name: 'Felix Braun', email: 'felix@braun.studio' },
  { name: 'Isabel Moreno', email: 'isabel.moreno@gmail.com' },
  { name: 'Design Team', email: 'design@lumenlabs.io' },
  { name: 'Engineering', email: 'eng@lumenlabs.io' },
]

export const PEOPLE_WHO_REPLY = new Set(ADDRESS_BOOK.map((c) => c.email))
