import { describe, expect, it } from 'vitest';
import { buildQuery, highlightTerms, parseSearch, searchThreads, threadMatches, type SearchContext } from './search';
import type { Thread } from '../domain/types';

const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);
const DAY = 86_400_000;

const ctx: SearchContext = {
  account: 'me@example.com',
  labels: [{ id: 'label-work', name: 'Work', color: 'blue' }],
  now: NOW,
};

function thread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 't-1',
    subject: 'Quarterly budget review',
    location: 'inbox',
    category: 'primary',
    starred: false,
    important: false,
    labelIds: [],
    snoozedUntil: null,
    messages: [
      {
        id: 'm-1',
        from: { name: 'Priya Raman', email: 'priya@acme.io' },
        to: [{ name: 'Me', email: 'me@example.com' }],
        cc: [],
        date: NOW - 2 * DAY,
        html: '<p>Please review the <a href="https://acme.io/budget">budget sheet</a>.</p>',
        text: 'Please review the budget sheet.',
        attachments: [{ id: 'a-1', name: 'budget-2026.xlsx', size: 120_000, kind: 'sheet' }],
        unread: true,
      },
    ],
    ...overrides,
  };
}

describe('parseSearch', () => {
  it('parses quoted values, operators and negation', () => {
    const tokens = parseSearch('from:"Priya Raman" -has:attachment is:unread hello world');
    expect(tokens).toEqual([
      { negated: false, key: 'from', value: 'priya raman' },
      { negated: true, key: 'has', value: 'attachment' },
      { negated: false, key: 'is', value: 'unread' },
      { negated: false, key: null, value: 'hello' },
      { negated: false, key: null, value: 'world' },
    ]);
  });

  it('keeps unknown operators as plain text', () => {
    const tokens = parseSearch('foo:bar');
    expect(tokens).toEqual([{ negated: false, key: null, value: 'foo:bar' }]);
  });
});

describe('threadMatches', () => {
  it('matches sender, subject and attachment filters', () => {
    const t = thread();
    expect(threadMatches(t, parseSearch('from:priya'), ctx)).toBe(true);
    expect(threadMatches(t, parseSearch('subject:budget has:attachment'), ctx)).toBe(true);
    expect(threadMatches(t, parseSearch('filename:xlsx'), ctx)).toBe(true);
  });

  it('honours negation', () => {
    const t = thread();
    expect(threadMatches(t, parseSearch('-has:attachment'), ctx)).toBe(false);
    expect(threadMatches(t, parseSearch('-from:priya'), ctx)).toBe(false);
    expect(threadMatches(t, parseSearch('-from:someone'), ctx)).toBe(true);
  });

  it('matches unread state and labels', () => {
    const t = thread({ labelIds: ['label-work'] });
    expect(threadMatches(t, parseSearch('is:unread label:work'), ctx)).toBe(true);
    expect(threadMatches(t, parseSearch('is:read'), ctx)).toBe(false);
  });

  it('hides spam and trash unless the query asks for them', () => {
    const t = thread({ location: 'trash' });
    expect(threadMatches(t, parseSearch('budget'), ctx)).toBe(false);
    expect(threadMatches(t, parseSearch('in:trash budget'), ctx)).toBe(true);
  });

  it('filters by age with newer_than and older_than', () => {
    const t = thread();
    expect(threadMatches(t, parseSearch('newer_than:3d'), ctx)).toBe(true);
    expect(threadMatches(t, parseSearch('newer_than:1d'), ctx)).toBe(false);
    expect(threadMatches(t, parseSearch('older_than:1d'), ctx)).toBe(true);
  });

  it('filters by size', () => {
    const t = thread();
    expect(threadMatches(t, parseSearch('larger:100k'), ctx)).toBe(true);
    expect(threadMatches(t, parseSearch('larger:1m'), ctx)).toBe(false);
  });
});

describe('searchThreads', () => {
  it('returns nothing for an empty query and sorts newest first', () => {
    const older = thread({ id: 'old', messages: [{ ...thread().messages[0], date: NOW - 5 * DAY }] });
    const newer = thread({ id: 'new', messages: [{ ...thread().messages[0], date: NOW - DAY }] });
    expect(searchThreads([older, newer], '', ctx)).toEqual([]);
    expect(searchThreads([older, newer], 'budget', ctx).map((t) => t.id)).toEqual(['new', 'old']);
  });
});

describe('highlightTerms', () => {
  it('returns free text and subject terms, skipping negated and single-character terms', () => {
    expect(highlightTerms('budget subject:review -spam a from:priya')).toEqual(['budget', 'review']);
  });
});

describe('buildQuery', () => {
  it('builds a query that parses back to the same operators', () => {
    const query = buildQuery({ from: 'Priya Raman', attachment: true, exclude: 'newsletter', within: '7d', scope: 'inbox' });
    expect(query).toBe('from:"Priya Raman" -newsletter has:attachment newer_than:7d in:inbox');
    const keys = parseSearch(query).map((t) => t.key);
    expect(keys).toEqual(['from', null, 'has', 'newer_than', 'in']);
  });
});
