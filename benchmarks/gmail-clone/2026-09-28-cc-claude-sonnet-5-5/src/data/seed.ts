import type { Contact, Label, Settings, Thread } from '../lib/types';
import { CORE_CONTACTS, ME } from './contacts';
import { materialize } from './seedTypes';
import * as people from './seedPeople';
import * as automated from './seedAutomated';
import * as mailbox from './seedMailbox';

export const SEED_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#1a73e8' },
  { id: 'family', name: 'Family', color: '#188038' },
  { id: 'travel', name: 'Travel', color: '#e8710a' },
  { id: 'finance', name: 'Finance', color: '#a142f4' },
  { id: 'receipts', name: 'Receipts', color: '#5f6368' },
  { id: 'design', name: 'Design', color: '#e52592' },
  { id: 'ideas', name: 'Ideas', color: '#12a4af' },
];

export const DEFAULT_SETTINGS: Settings = {
  density: 'default',
  theme: 'system',
  accent: 'blue',
  categoriesEnabled: { primary: true, promotions: true, social: true, updates: true },
  readingPane: 'off',
  undoSendSeconds: 10,
  signature: 'Jordan Hayes\nProduct designer · hayes.example',
  signatureEnabled: true,
  keyboardShortcuts: true,
  smartReplies: true,
  hoverActions: true,
  autoAdvance: 'list',
  simulateIncoming: false,
  sidebarCollapsed: false,
  previewSnippets: true,
};

export function buildSeed(now: number): { threads: Thread[]; contacts: Contact[]; labels: Label[] } {
  const contacts: Contact[] = [...CORE_CONTACTS, ...people.contacts, ...automated.contacts, ...mailbox.contacts];
  const byId = new Map<string, Contact>(contacts.map((c) => [c.id, c]));
  byId.set('me', ME);
  const threads = [
    ...materialize(people.threads, byId, now, 'p'),
    ...materialize(automated.threads, byId, now, 'a'),
    ...materialize(mailbox.threads, byId, now, 'm'),
  ];
  return { threads, contacts, labels: SEED_LABELS.map((l) => ({ ...l })) };
}
