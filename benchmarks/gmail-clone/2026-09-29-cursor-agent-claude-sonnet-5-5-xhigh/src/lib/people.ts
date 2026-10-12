import type { Contact, Label, Person } from './types';
import { avatarColor } from './text';

export const ME: Person = { name: 'Avery Quinn', email: 'avery.quinn@brightlane.io' };

export function isMe(p: Person): boolean {
  return p.email.toLowerCase() === ME.email;
}

function c(name: string, email: string, freq: number, persona?: Contact['persona'], bot = false): Contact {
  return { name, email, color: avatarColor(email), freq, persona, bot };
}

export const P = {
  priya: c('Priya Nair', 'priya.nair@brightlane.io', 92, 'warm'),
  marcus: c('Marcus Webb', 'marcus.webb@brightlane.io', 74, 'brisk'),
  elena: c('Elena Rossi', 'elena.rossi@brightlane.io', 66, 'formal'),
  tom: c('Tom Adeyemi', 'tom.adeyemi@brightlane.io', 58, 'playful'),
  hannah: c('Hannah Kim', 'hannah.kim@brightlane.io', 31, 'warm'),
  diego: c('Diego Alvarez', 'diego.alvarez@brightlane.io', 27, 'formal'),
  sofia: c('Sofia Lindqvist', 'sofia.lindqvist@brightlane.io', 35, 'playful'),
  grace: c('Grace Quinn', 'grace.quinn@hearthmail.com', 48, 'warm'),
  theo: c('Theo Quinn', 'theo.quinn@hearthmail.com', 44, 'playful'),
  jules: c('Jules Moreau', 'jules.moreau@hearthmail.com', 39, 'playful'),
  nico: c('Nico Ferreira', 'nico.ferreira@hearthmail.com', 80, 'warm'),
  rachel: c('Rachel Stein', 'rstein@steinlarkin.law', 12, 'formal'),
  kenji: c('Kenji Watanabe', 'kenji.watanabe@tidepool.co', 41, 'formal'),
  olivia: c('Olivia Grant', 'olivia.grant@talentloop.co', 4, 'brisk'),
  sam: c('Sam Patel', 'sam@oakridgeproperties.co', 6, 'formal'),
  marisol: c('Marisol Reyes', 'marisol.reyes@hearthmail.com', 2, 'warm'),
  ines: c('Inês Duarte', 'ines@casadelisboa.pt', 3, 'warm'),
};

export const BOTS = {
  stackhouse: { name: 'Stackhouse', email: 'notifications@stackhouse.dev' },
  orbit: { name: 'Orbit Bank', email: 'statements@orbitbank.com' },
  parcel: { name: 'Parcel', email: 'notify@parcelpost.co' },
  circle: { name: 'Circle', email: 'notifications@circle-social.com' },
  frame: { name: 'The Weekly Frame', email: 'hello@weeklyframe.email' },
  wanderly: { name: 'Wanderly', email: 'trips@wanderly.travel' },
  kettle: { name: 'Kettle & Co', email: 'hello@kettleandco.coffee' },
  pulse: { name: 'Pulse Fitness', email: 'team@pulsefit.app' },
  fable: { name: 'Fable', email: 'hello@fable.design' },
  relay: { name: 'Relay', email: 'digest@relayapp.io' },
  slate: { name: 'Slate Docs', email: 'share@slatedocs.com' },
  it: { name: 'Brightlane IT', email: 'it@brightlane.io' },
  nimbus: { name: 'Nimbus Cloud', email: 'billing@nimbuscloud.com' },
  northwind: { name: 'Northwind Air', email: 'deals@northwindair.com' },
  harbor: { name: 'Harbor Insurance', email: 'service@harborinsure.com' },
  loop: { name: 'Loop Podcasts', email: 'weekly@looppods.fm' },
  pagewise: { name: 'Pagewise', email: 'team@pagewise.so' },
  meridian: { name: 'Meridian Energy', email: 'accounts@meridianenergy.co' },
  trailhead: { name: 'Trailhead Outfitters', email: 'offers@trailheadgear.com' },
  linehouse: { name: 'Linehouse Books', email: 'reads@linehousebooks.com' },
  cadence: { name: 'Cadence', email: 'invites@cadence.app' },
  postmaster: { name: 'Mail Delivery Subsystem', email: 'mailer-daemon@brightlane.io' },
};

export const CONTACTS: Contact[] = Object.values(P);

export const SEED_LABELS: Label[] = [
  { id: 'l_work', name: 'Work', color: '#4a86e8' },
  { id: 'l_atlas', name: 'Project Atlas', color: '#8e63ce' },
  { id: 'l_finance', name: 'Finance', color: '#16a765' },
  { id: 'l_travel', name: 'Travel', color: '#ffad46' },
  { id: 'l_family', name: 'Family', color: '#f691b3' },
  { id: 'l_receipts', name: 'Receipts', color: '#43d692' },
  { id: 'l_followup', name: 'Follow up', color: '#e66550' },
  { id: 'l_legal', name: 'Legal', color: '#666666' },
  { id: 'l_personal', name: 'Personal', color: '#fad165' },
];
