import { describe, expect, it } from 'vitest';

import { formatClock, formatHoursMinutes, parseHoursMinutes } from '@/lib/format-duration';

describe('formatHoursMinutes', () => {
  it('pads hours and minutes', () => {
    expect(formatHoursMinutes(30)).toBe('00:30');
    expect(formatHoursMinutes(65)).toBe('01:05');
    expect(formatHoursMinutes(1440)).toBe('24:00');
  });
});

describe('parseHoursMinutes', () => {
  it('parses HH:mm and short forms', () => {
    expect(parseHoursMinutes('01:30')).toBe(90);
    expect(parseHoursMinutes('1:5')).toBe(65);
    expect(parseHoursMinutes(' 2 ')).toBe(120);
    expect(parseHoursMinutes('24:00')).toBe(1440);
  });

  it('rejects invalid or out-of-range input', () => {
    expect(parseHoursMinutes('')).toBeNaN();
    expect(parseHoursMinutes('abc')).toBeNaN();
    expect(parseHoursMinutes('01:60')).toBeNaN();
    expect(parseHoursMinutes('00:00')).toBeNaN();
    expect(parseHoursMinutes('24:30')).toBeNaN();
    expect(parseHoursMinutes('24:01')).toBeNaN();
    expect(parseHoursMinutes('1:60')).toBeNaN();
    expect(parseHoursMinutes('0:00')).toBeNaN();
    expect(parseHoursMinutes('123')).toBeNaN();
    expect(parseHoursMinutes('-1')).toBeNaN();
    expect(parseHoursMinutes('1.5')).toBeNaN();
  });
});

describe('formatClock', () => {
  it('formats minutes as H:mm', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(61)).toBe('1:01');
    expect(formatClock(605)).toBe('10:05');
  });
});
