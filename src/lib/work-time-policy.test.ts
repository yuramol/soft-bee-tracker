import { describe, expect, it } from 'vitest';

import { getEarliestOpenDateKey, getEntryEditDeadline, isEntryDateOpen } from '@/lib/work-time-policy';

describe('getEntryEditDeadline', () => {
  it('ends at 23:59 UTC+2 on the 5th of the next month', () => {
    expect(getEntryEditDeadline('2026-11-14').toISOString()).toBe('2026-12-05T21:59:59.999Z');
  });

  it('rolls over the year', () => {
    expect(getEntryEditDeadline('2026-12-31').toISOString()).toBe('2027-01-05T21:59:59.999Z');
  });
});

describe('isEntryDateOpen', () => {
  it('keeps last month open until the deadline minute in UTC+2', () => {
    expect(isEntryDateOpen('2026-11-30', new Date('2026-12-05T21:59:00Z'))).toBe(true);
    expect(isEntryDateOpen('2026-11-30', new Date('2026-12-05T22:00:00Z'))).toBe(false);
  });

  it('closes older months', () => {
    expect(isEntryDateOpen('2026-10-31', new Date('2026-12-01T10:00:00Z'))).toBe(false);
  });
});

describe('getEarliestOpenDateKey', () => {
  it('includes last month up to and on the 5th', () => {
    expect(getEarliestOpenDateKey(new Date('2026-12-05T21:00:00Z'))).toBe('2026-11-01');
  });

  it('switches to the current month after the deadline in UTC+2', () => {
    // 22:30 UTC on the 5th is already 00:30 on the 6th in UTC+2
    expect(getEarliestOpenDateKey(new Date('2026-12-05T22:30:00Z'))).toBe('2026-12-01');
  });

  it('handles January', () => {
    expect(getEarliestOpenDateKey(new Date('2027-01-03T10:00:00Z'))).toBe('2026-12-01');
  });
});
