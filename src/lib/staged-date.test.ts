import { describe, expect, it } from 'vitest';

import { getYearPage, getYearPageStart, isMonthAfter } from '@/lib/staged-date';

describe('getYearPageStart', () => {
  it('aligns years to blocks of twelve', () => {
    expect(getYearPageStart(2026)).toBe(2016);
    expect(getYearPageStart(2016)).toBe(2016);
    expect(getYearPageStart(2028)).toBe(2028);
  });
});

describe('getYearPage', () => {
  it('lists twelve consecutive years', () => {
    expect(getYearPage(2016)).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027]);
  });
});

describe('isMonthAfter', () => {
  const limit = new Date(2026, 10, 10);

  it('compares year and month against the limit', () => {
    expect(isMonthAfter(2026, 10, limit)).toBe(false);
    expect(isMonthAfter(2026, 11, limit)).toBe(true);
    expect(isMonthAfter(2027, 0, limit)).toBe(true);
    expect(isMonthAfter(2025, 11, limit)).toBe(false);
    expect(isMonthAfter(2030, 0, undefined)).toBe(false);
  });
});
