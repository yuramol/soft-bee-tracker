import { describe, expect, it } from 'vitest';

import { buildTimeZoneOptions, getTimeZoneOffset, isValidTimeZone, toTimeZoneOption } from '@/lib/time-zones';

// mid-January, so northern-hemisphere zones are on standard time
const winter = new Date('2026-01-15T12:00:00Z');

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects anything else', () => {
    expect(isValidTimeZone('Europe/Kyiv')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('getTimeZoneOffset', () => {
  it('formats the offset for the given moment', () => {
    expect(getTimeZoneOffset('Europe/Kyiv', winter)).toBe('GMT+02:00');
    expect(getTimeZoneOffset('America/New_York', winter)).toBe('GMT-05:00');
    expect(getTimeZoneOffset('UTC', winter)).toBe('GMT+00:00');
  });
});

describe('toTimeZoneOption', () => {
  it('builds a readable label', () => {
    expect(toTimeZoneOption('America/New_York', winter)).toEqual({
      value: 'America/New_York',
      offset: 'GMT-05:00',
      label: 'America/New York (GMT-05:00)'
    });
  });
});

describe('buildTimeZoneOptions', () => {
  it('sorts west to east, adds valid extra zones once and skips invalid ones', () => {
    const options = buildTimeZoneOptions(['Europe/Kyiv', 'UTC', 'America/New_York'], ['Asia/Tokyo', 'UTC', 'Nope/Nowhere', null], winter);

    expect(options.map((option) => option.value)).toEqual(['America/New_York', 'UTC', 'Europe/Kyiv', 'Asia/Tokyo']);
  });
});
