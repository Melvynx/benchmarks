import { describe, expect, it } from 'vitest';
import { parseState } from './storage';

describe('parseState', () => {
  it('returns defaults for an empty browser', () => {
    expect(parseState(null)).toMatchObject({
      cityIds: ['san-francisco', 'denpasar', 'geneva'],
      mode: 'meeting',
      wake: 7,
      sleep: 23,
      format: '12',
    });
  });

  it('drops unknown and duplicate cities and keeps a valid empty list', () => {
    expect(parseState('{"cityIds":["geneva","geneva","nope","tokyo"],"mode":"base","wake":22,"sleep":6,"format":"24"}')).toEqual({
      cityIds: ['geneva', 'tokyo'],
      mode: 'base',
      wake: 22,
      sleep: 6,
      format: '24',
    });
    expect(parseState('{"cityIds":[]}')?.cityIds).toEqual([]);
    expect(parseState('not-json').mode).toBe('meeting');
    expect(parseState('{"mode":"nope","wake":99,"format":"ampm"}')).toMatchObject({
      mode: 'meeting',
      wake: 7,
      format: '12',
    });
  });
});
