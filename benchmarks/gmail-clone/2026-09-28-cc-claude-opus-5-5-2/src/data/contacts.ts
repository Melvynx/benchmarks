import type { Contact } from './types';

export const ME: Contact = { name: 'Robin Hale', email: 'robin.hale@fernbrook.co', org: 'Fernbrook', kind: 'person' };

export const CONTACTS: Record<string, Contact> = {
  /* ---------- Fernbrook ---------- */
  priya: { name: 'Priya Raman', email: 'priya.raman@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  maya: { name: 'Maya Chen', email: 'maya.chen@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  aisha: { name: 'Aisha Karim', email: 'aisha.karim@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  devon: { name: 'Devon Price', email: 'devon.price@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  marcus: { name: 'Marcus Bell', email: 'marcus.bell@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  ines: { name: 'Ines Duarte', email: 'ines.duarte@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  theo: { name: 'Theo Marsh', email: 'theo.marsh@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  lena: { name: 'Lena Fischer', email: 'lena.fischer@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  kai: { name: 'Kai Tanaka', email: 'kai.tanaka@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  jonah: { name: 'Jonah Whitaker', email: 'jonah.whitaker@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  carmen: { name: 'Carmen Ruiz', email: 'carmen.ruiz@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  felix: { name: 'Felix Novak', email: 'felix.novak@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  designTeam: { name: 'Fernbrook Design', email: 'design@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  everyone: { name: 'Fernbrook Everyone', email: 'everyone@fernbrook.co', org: 'Fernbrook', kind: 'person' },
  calendar: { name: 'Calendar', email: 'calendar-notification@fernbrook.co', org: 'Fernbrook', kind: 'brand', color: '#1a73e8' },

  /* ---------- Clients & vendors ---------- */
  rachel: { name: 'Rachel Okoye', email: 'rachel.okoye@harborhealth.com', org: 'Harbor Health', kind: 'person' },
  ben: { name: 'Ben Lindqvist', email: 'b.lindqvist@harborhealth.com', org: 'Harbor Health', kind: 'person' },
  grace: { name: 'Grace Whitfield', email: 'grace.whitfield@juniperbank.com', org: 'Juniper Bank', kind: 'person' },
  omar: { name: 'Omar Haddad', email: 'omar.haddad@juniperbank.com', org: 'Juniper Bank', kind: 'person' },
  jess: { name: 'Jess Calloway', email: 'jess@tidewateroutfitters.com', org: 'Tidewater Outfitters', kind: 'person' },
  hannah: { name: 'Hannah Ortiz', email: 'hannah@fieldnoteresearch.com', org: 'Fieldnote Research', kind: 'person' },
  fieldnoteBilling: { name: 'Fieldnote Research Billing', email: 'billing@fieldnoteresearch.com', org: 'Fieldnote Research', kind: 'brand', color: '#334155' },
  dana: { name: 'Dana Whitlock', email: 'events@silverfirlodge.com', org: 'Silver Fir Lodge', kind: 'person' },
  paige: { name: 'Paige Donnelly', email: 'paige.donnelly@lumenlabs.io', org: 'Lumen Labs', kind: 'person' },
  mira: { name: 'Mira Solberg', email: 'mira@tessellateconf.com', org: 'Tessellate Conf', kind: 'person' },
  rita: { name: 'Rita Gomez, CPA', email: 'rita@gomezcpa.com', org: 'Gomez & Associates CPA', kind: 'person' },

  /* ---------- Personal ---------- */
  sam: { name: 'Sam Okafor', email: 'sam.okafor@pinemail.com', kind: 'person' },
  nora: { name: 'Nora Hale', email: 'nora.hale@pinemail.com', kind: 'person' },
  mom: { name: 'Ellen Hale', email: 'ellenhale58@cascadenet.net', kind: 'person' },
  dad: { name: 'Richard Hale', email: 'rich.hale@cascadenet.net', kind: 'person' },
  jules: { name: 'Jules Moreau', email: 'jules@julesmoreau.studio', kind: 'person' },
  leah: { name: 'Leah Brooks', email: 'leah.brooks@pinemail.com', kind: 'person' },
  tomas: { name: 'Tomás Rivera', email: 'tomas.rivera@pinemail.com', kind: 'person' },
  gary: { name: 'Gary Lindgren', email: 'gary@lindgrenproperties.com', org: 'Lindgren Property Management', kind: 'person' },
  dentist: { name: 'Alder Street Dental', email: 'appointments@alderstreetdental.com', org: 'Alder Street Dental', kind: 'brand', color: '#0e7490' },
  owen: { name: 'Owen Pryce', email: 'owen@rosecitystriders.org', org: 'Rose City Striders', kind: 'person' },

  /* ---------- Brands & automated senders ---------- */
  forgehub: { name: 'Forgehub', email: 'notifications@forgehub.dev', kind: 'brand', color: '#24292f' },
  canvasly: { name: 'Canvasly', email: 'no-reply@canvasly.app', kind: 'brand', color: '#7c3aed' },
  northstar: { name: 'Northstar Air', email: 'itinerary@northstarair.com', kind: 'brand', color: '#0b3d91' },
  harborPine: { name: 'Harbor & Pine Hotels', email: 'reservations@harborandpine.com', kind: 'brand', color: '#1f4e3d' },
  juniperAlerts: { name: 'Juniper Bank Alerts', email: 'alerts@juniperbank.com', kind: 'brand', color: '#0f766e' },
  paystream: { name: 'Paystream', email: 'no-reply@paystream.io', kind: 'brand', color: '#2563eb' },
  greenbasket: { name: 'Greenbasket', email: 'orders@greenbasket.com', kind: 'brand', color: '#16a34a' },
  reelhouse: { name: 'Reelhouse', email: 'hello@reelhouse.tv', kind: 'brand', color: '#e11d48' },
  linkwell: { name: 'Linkwell', email: 'notifications@linkwell.com', kind: 'brand', color: '#0a66c2' },
  chatter: { name: 'Chatter', email: 'notify@chatter.social', kind: 'brand', color: '#1d9bf0' },
  theMargin: { name: 'The Margin', email: 'editor@themargin.news', kind: 'brand', color: '#111827' },
  daybreak: { name: 'Daybreak', email: 'hello@daybreak.news', kind: 'brand', color: '#f59e0b' },
  summit: { name: 'Summit Supply Co.', email: 'deals@summitsupply.co', kind: 'brand', color: '#b45309' },
  rydr: { name: 'Rydr', email: 'receipts@rydr.app', kind: 'brand', color: '#111111' },
  driftbox: { name: 'Driftbox', email: 'no-reply@driftbox.com', kind: 'brand', color: '#0061fe' },
  pinecone: { name: 'Pinecone Community Forum', email: 'forum@pinecone-community.org', kind: 'brand', color: '#15803d' },
  striders: { name: 'Rose City Striders', email: 'digest@rosecitystriders.org', kind: 'brand', color: '#be123c' },
  keystone: { name: 'Keystone Accounts', email: 'security-noreply@keystone.id', kind: 'brand', color: '#475569' },
  parcelpath: { name: 'Parcelpath', email: 'tracking@parcelpath.com', kind: 'brand', color: '#7c2d12' },
  pdxPower: { name: 'PDX Power & Light', email: 'billing@pdxpower.com', kind: 'brand', color: '#ca8a04' },
  ember: { name: 'Ember Coffee Roasters', email: 'hello@embercoffee.co', kind: 'brand', color: '#9a3412' },
  tessellate: { name: 'Tessellate Conf', email: 'tickets@tessellateconf.com', kind: 'brand', color: '#db2777' },

  /* ---------- Junk ---------- */
  spamRewards: { name: 'Rewards Center', email: 'winner-notify@rewards-claim-center.xyz', kind: 'brand' },
  spamCrypto: { name: 'BitYield Pro', email: 'support@bityield-pro.biz', kind: 'brand' },
  spamInvoice: { name: 'Accounts Receivable', email: 'billing@secure-invoicing-portal.co', kind: 'brand' },
  spamBank: { name: 'Juniper Bank Security', email: 'security@juniperbank-verify.com', kind: 'brand' },
  spamParcel: { name: 'Parcel Delivery Service', email: 'notice@parcel-redelivery.info', kind: 'brand' },
};
