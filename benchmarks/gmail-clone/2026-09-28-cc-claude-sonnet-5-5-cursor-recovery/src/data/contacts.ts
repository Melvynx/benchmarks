import type { Contact } from '../lib/types';

/**
 * The account owner. Jordan Hayes is a freelance product designer who spends
 * three days a week embedded at the analytics start-up Northlight and takes on
 * a few other clients (Brightwave, Larkspur Coffee). Friends and family use
 * the same address.
 */
export const ME: Contact = {
  id: 'me',
  name: 'Jordan Hayes',
  email: 'jordan.hayes@hayes.example',
  color: '#1a73e8',
  title: 'Product designer',
};

/** Core cast that every seed file may reference by id. All domains are fictional. */
export const CORE_CONTACTS: Contact[] = [
  // Northlight (anchor client)
  { id: 'priya', name: 'Priya Nair', email: 'priya.nair@northlight.example', org: 'Northlight', title: 'Engineering Manager', color: '#188038', replies: true },
  { id: 'marcus', name: 'Marcus Chen', email: 'marcus.chen@northlight.example', org: 'Northlight', title: 'Design Lead', color: '#a142f4', replies: true },
  { id: 'elena', name: 'Elena Rossi', email: 'elena.rossi@northlight.example', org: 'Northlight', title: 'Data Scientist', color: '#e8710a', replies: true },
  { id: 'tom', name: 'Tom Becker', email: 'tom.becker@northlight.example', org: 'Northlight', title: 'CEO', color: '#1967d2', replies: true },
  { id: 'amara', name: 'Amara Okafor', email: 'amara.okafor@northlight.example', org: 'Northlight', title: 'Head of Sales', color: '#d93025', replies: true },
  { id: 'sofia', name: 'Sofia Lindqvist', email: 'sofia.lindqvist@northlight.example', org: 'Northlight', title: 'People Operations', color: '#12a4af', replies: true },
  { id: 'kenji', name: 'Kenji Watanabe', email: 'kenji.watanabe@northlight.example', org: 'Northlight', title: 'Staff Engineer', color: '#5f6368', replies: true },
  { id: 'hannah', name: 'Hannah Brooks', email: 'hannah.brooks@northlight.example', org: 'Northlight', title: 'Customer Success', color: '#e52592', replies: true },
  // Other clients & professional network
  { id: 'rachel', name: 'Rachel Adeyemi', email: 'rachel.adeyemi@brightwave.example', org: 'Brightwave', title: 'VP Product', color: '#b06000', replies: true },
  { id: 'omar', name: 'Omar Haddad', email: 'omar@larkspurcoffee.example', org: 'Larkspur Coffee', title: 'Founder', color: '#7b5e2e', replies: true },
  { id: 'david', name: 'David Kim', email: 'david.kim@harborcapital.example', org: 'Harbor Capital', title: 'Partner', color: '#0b57d0', replies: true },
  { id: 'jenna', name: 'Jenna Walsh', email: 'jenna.walsh@talentbridge.example', org: 'TalentBridge', title: 'Senior Recruiter', color: '#c5221f', replies: true },
  { id: 'lucia', name: 'Lucia Ferraro', email: 'lucia.ferraro@polimi.example', org: 'Politecnico', title: 'Professor & mentor', color: '#137333', replies: true },
  { id: 'wes', name: 'Wes Holloway', email: 'wes@holloway-accounting.example', org: 'Holloway & Co.', title: 'Accountant', color: '#3c4043', replies: true },
  // Family
  { id: 'linda', name: 'Linda Hayes', email: 'linda.hayes@homemail.example', title: 'Mom', color: '#e37400', replies: true },
  { id: 'riley', name: 'Riley Hayes', email: 'riley.hayes@homemail.example', title: 'Sister', color: '#9334e6', replies: true },
  { id: 'frank', name: 'Frank Hayes', email: 'frank.hayes@homemail.example', title: 'Dad', color: '#1e8e3e', replies: true },
  // Friends & community
  { id: 'dev', name: 'Dev Patel', email: 'dev.patel@postbox.example', title: 'Friend', color: '#1a73e8', replies: true },
  { id: 'chloe', name: 'Chloé Martin', email: 'chloe.martin@postbox.example', title: 'Friend', color: '#d01884', replies: true },
  { id: 'noah', name: 'Noah Fischer', email: 'noah.fischer@postbox.example', title: 'Climbing partner', color: '#0d652d', replies: true },
  { id: 'ana', name: 'Ana Souza', email: 'ana.souza@postbox.example', title: 'College friend', color: '#f29900', replies: true },
  { id: 'sam', name: 'Sam Ortega', email: 'sam@eastsiderunners.example', org: 'Eastside Runners', title: 'Run club captain', color: '#e8710a', replies: true },
  { id: 'marta', name: 'Marta Kowalski', email: 'marta.kowalski@kowalskiproperties.example', org: 'Kowalski Properties', title: 'Landlord', color: '#80868b', replies: true },
];

export const CONTACT_COLORS = [
  '#1a73e8', '#188038', '#e8710a', '#a142f4', '#d93025', '#12a4af', '#b06000', '#e52592', '#5f6368', '#0b57d0', '#137333', '#c5221f',
];
